-- Mark the winner of a discard/reserve race before either side crosses into Storage.
ALTER TABLE public.xrag_prepared_uploads ADD COLUMN discarding boolean NOT NULL DEFAULT false;

-- A confirmed upload becomes ineligible for expiry before any child archive is read.
CREATE FUNCTION public.reserve_xrag_import(p_id uuid, p_token uuid, p_user_id uuid, p_plan jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.xrag_prepared_uploads
    WHERE user_id = p_user_id AND source_path = p_plan->'source'->>'path'
      AND id::text = p_plan->'source'->>'uploadId' AND NOT discarding
      AND created_at > clock_timestamp() - interval '1 hour'
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'XRAG_TRANSFER_EXPIRED'; END IF;
  INSERT INTO public.xrag_import_transactions(id,token,user_id,plan) VALUES(p_id,p_token,p_user_id,p_plan);
END;
$$;

-- Plan all targets and take their file reservations atomically under the original lease.
CREATE FUNCTION public.set_xrag_import_plan(p_id uuid, p_token uuid, p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE file jsonb; entry jsonb; path text; files jsonb := '[]';
BEGIN
  PERFORM 1 FROM public.xrag_import_transactions t WHERE t.id = p_id AND t.token = p_token
    AND t.state = 'preparing' AND t.expires_at > clock_timestamp()
    AND (t.plan->'source') IS NOT DISTINCT FROM (p_plan->'source') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'XRAG_IMPORT_LEASE_LOST'; END IF;
  FOR entry IN SELECT value FROM pg_catalog.jsonb_array_elements(p_plan->'entries') WHERE value->>'kind' = 'documentRepository' ORDER BY value->>'localId' LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xrag-repository:' || (p_plan->'target'->>'workspaceId') || '/' || (entry->>'localId'), 0));
    IF public.xrag_resource_revision('documentRepository',entry->>'localId',p_plan->'target'->>'workspaceId') IS DISTINCT FROM entry->>'expectedRevision' THEN
      RAISE EXCEPTION 'XRAG_IMPORT_CONFLICT';
    END IF;
  END LOOP;
  FOR path IN SELECT DISTINCT value->>'basePath' FROM pg_catalog.jsonb_array_elements(p_plan->'files') ORDER BY 1 LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xrag-file:' || path, 0));
    IF EXISTS (SELECT 1 FROM public.storage_file_locks l WHERE l.bucket = 'database_files' AND l.path = path AND l.expires_at > now()) THEN
      RAISE EXCEPTION 'FILE_PROCESSING_IN_PROGRESS';
    END IF;
    IF EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'database_files' AND o.name = path || '.__xrag_text_write.json') THEN
      RAISE EXCEPTION 'TEXT_WRITE_RECOVERY_REQUIRED';
    END IF;
    INSERT INTO public.xrag_import_reservations(path,import_id) VALUES(path,p_id);
  END LOOP;
  FOR file IN SELECT value FROM pg_catalog.jsonb_array_elements(p_plan->'files') LOOP
    files := files || pg_catalog.jsonb_build_array(file || pg_catalog.jsonb_build_object('hadOriginal', EXISTS (
      SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'database_files' AND o.name = file->>'path'
    )));
  END LOOP;
  p_plan := pg_catalog.jsonb_set(p_plan, '{files}', files);
  UPDATE public.xrag_import_transactions SET plan = p_plan WHERE id = p_id AND expires_at > clock_timestamp();
  IF NOT FOUND THEN RAISE EXCEPTION 'XRAG_IMPORT_LEASE_LOST'; END IF;
  RETURN p_plan;
END;
$$;

-- Older workers supply a complete plan in a single call.
CREATE OR REPLACE FUNCTION public.begin_xrag_import(p_id uuid, p_token uuid, p_user_id uuid, p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.xrag_import_transactions(id,token,user_id,plan) VALUES(p_id,p_token,p_user_id,p_plan);
  RETURN public.set_xrag_import_plan(p_id,p_token,p_plan);
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_xrag_import(uuid,uuid,uuid,jsonb), public.set_xrag_import_plan(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_xrag_import(uuid,uuid,uuid,jsonb), public.set_xrag_import_plan(uuid,uuid,jsonb) TO service_role;

-- Skip a selection whose reservation is committing across the expiry boundary.
CREATE OR REPLACE FUNCTION public.expired_xrag_prepared_uploads() RETURNS TABLE(source_path text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT u.source_path FROM public.xrag_prepared_uploads u
  WHERE (u.discarding OR u.created_at < now() - interval '1 hour')
    AND NOT EXISTS (SELECT 1 FROM public.xrag_import_transactions t
      WHERE t.plan->'source'->>'path' = u.source_path AND t.state IN ('preparing','applying','rolling_back'))
  ORDER BY u.created_at LIMIT 100 FOR UPDATE OF u SKIP LOCKED;
$$;

-- This is the cleanup worker's final check before its first (and every later)
-- Storage batch. A concurrent reservation or discard must observe the winner.
CREATE OR REPLACE FUNCTION public.removable_xrag_objects(p_bucket text, p_paths text[], p_source_path text) RETURNS text[]
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.xrag_prepared_uploads WHERE source_path = p_source_path FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.xrag_import_transactions t
    WHERE t.state IN ('preparing','applying','rolling_back') AND t.plan->'source'->>'path' = p_source_path)
    OR EXISTS (SELECT 1 FROM public.scheduled_jobs j
      WHERE j.id = 'xrag:prepare:' || split_part(p_source_path,'/',1) || '/' || lower(split_part(p_source_path,'/',2))
        AND j.state IN ('pending','running')) THEN RETURN NULL; END IF;
  UPDATE public.xrag_prepared_uploads SET discarding = true WHERE source_path = p_source_path AND NOT discarding;
  RETURN ARRAY(
    SELECT path FROM unnest(p_paths) AS path
    WHERE NOT EXISTS (
      SELECT 1 FROM public.artifact_publications
      WHERE upload_path = 'imported/' || p_bucket || '/' || path AND retained_object_id IS NOT NULL
    )
  );
END;
$$;
