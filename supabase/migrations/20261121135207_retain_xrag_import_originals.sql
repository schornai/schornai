-- The publication and its immutable Storage object acquire the same lifetime
-- in the import commit. The FK serializes adoption against an in-flight delete.
ALTER TABLE public.artifact_publications ADD COLUMN retained_object_id uuid
  UNIQUE REFERENCES storage.objects(id) ON DELETE RESTRICT;

CREATE FUNCTION public.retain_xrag_import_original() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE bucket text := split_part(NEW.upload_path,'/',2);
BEGIN
  IF bucket NOT IN ('xrag-transfers','xrag-prepared') THEN
    RAISE EXCEPTION 'XRAG_INVALID_ARTIFACT_SOURCE';
  END IF;
  SELECT o.id INTO STRICT NEW.retained_object_id FROM storage.objects o
  WHERE o.bucket_id = bucket AND o.name = substr(NEW.upload_path, length('imported/' || bucket || '/') + 1);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.retain_xrag_import_original() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER retain_xrag_import_original BEFORE INSERT ON public.artifact_publications
FOR EACH ROW WHEN (NEW.upload_path LIKE 'imported/%')
EXECUTE FUNCTION public.retain_xrag_import_original();

-- Both a second tab and a retried HTTP request must be unable to begin a second
-- import. Legacy attempts did not record an uploadId and can finish normally.
CREATE UNIQUE INDEX xrag_import_once_per_upload
  ON public.xrag_import_transactions(user_id, (plan->'source'->>'uploadId'))
  WHERE plan->'source'->>'uploadId' IS NOT NULL;

CREATE FUNCTION public.get_xrag_import_status(p_upload_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(
    (SELECT t.state FROM public.xrag_import_transactions t
     WHERE t.user_id = auth.uid() AND t.plan->'source'->>'uploadId' = p_upload_id::text),
    -- Earlier clients recorded only the source path and could start more than one attempt.
    (SELECT t.state FROM public.xrag_import_transactions t
     WHERE t.user_id = auth.uid() AND t.plan->'source'->>'uploadId' IS NULL
       AND lower(split_part(t.plan->'source'->>'path','/',2)) = p_upload_id::text
     ORDER BY (t.state = 'committed') DESC, t.created_at DESC, t.id DESC LIMIT 1),
    (SELECT 'ready' FROM public.xrag_prepared_uploads u
     WHERE u.id = p_upload_id AND u.user_id = auth.uid() AND u.created_at > now() - interval '1 hour'),
    (SELECT CASE WHEN j.state IN ('pending','running') THEN 'inspecting' WHEN j.state = 'failed' THEN 'inspection_failed' END
     FROM public.scheduled_jobs j WHERE j.id = 'xrag:prepare:' || auth.uid() || '/' || p_upload_id)
  ) WHERE public.authorize('workspace-admin'::public.user_role);
$$;
REVOKE ALL ON FUNCTION public.get_xrag_import_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_xrag_import_status(uuid) TO authenticated;

CREATE FUNCTION public.xrag_object_is_retained(p_object_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.artifact_publications WHERE retained_object_id = p_object_id);
$$;
REVOKE ALL ON FUNCTION public.xrag_object_is_retained(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.xrag_object_is_retained(uuid) TO authenticated, service_role;
-- Once consumed, the uploader's transfer list/direct links must not rediscover
-- the retained file as a fresh import. The artifact worker uses the service role.
CREATE POLICY "Retained XRAG originals leave the transfer inventory" ON storage.objects AS RESTRICTIVE
FOR SELECT TO authenticated USING (bucket_id <> 'xrag-transfers' OR NOT public.xrag_object_is_retained(id));

CREATE OR REPLACE FUNCTION public.expired_xrag_transfers() RETURNS TABLE(name text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'xrag-transfers' AND o.updated_at < now() - interval '72 hours'
    AND NOT public.xrag_object_is_retained(o.id)
    AND NOT EXISTS (SELECT 1 FROM public.scheduled_jobs j
      WHERE j.id = 'xrag:prepare:' || split_part(o.name,'/',1) || '/' || lower(split_part(o.name,'/',2))
        AND j.state IN ('pending','running'))
    AND NOT EXISTS (SELECT 1 FROM public.xrag_prepared_uploads u WHERE u.source_path = o.name)
  ORDER BY o.updated_at LIMIT 100;
$$;
CREATE OR REPLACE FUNCTION public.expired_xrag_prepared_objects() RETURNS TABLE(name text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'xrag-prepared' AND o.updated_at < now() - interval '72 hours'
    AND NOT public.xrag_object_is_retained(o.id)
    AND NOT EXISTS (SELECT 1 FROM public.xrag_prepared_uploads u WHERE pg_catalog.starts_with(o.name, u.prefix || '/'))
  ORDER BY o.updated_at LIMIT 100;
$$;

CREATE FUNCTION public.removable_xrag_objects(p_bucket text, p_paths text[], p_source_path text) RETURNS text[]
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT ARRAY(
    SELECT path FROM unnest(p_paths) AS path
    WHERE NOT EXISTS (
      SELECT 1 FROM public.artifact_publications
      WHERE upload_path = 'imported/' || p_bucket || '/' || path AND retained_object_id IS NOT NULL
    )
  ) WHERE NOT EXISTS (
    SELECT 1 FROM public.xrag_import_transactions t
    WHERE t.state IN ('preparing','applying','rolling_back') AND t.plan->'source'->>'path' = p_source_path
  ) AND NOT EXISTS (
    SELECT 1 FROM public.scheduled_jobs j
    WHERE j.id = 'xrag:prepare:' || split_part(p_source_path,'/',1) || '/' || lower(split_part(p_source_path,'/',2))
      AND j.state IN ('pending','running')
  );
$$;
REVOKE ALL ON FUNCTION public.removable_xrag_objects(text,text[],text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.removable_xrag_objects(text,text[],text) TO service_role;

CREATE POLICY "XRAG transfer archives are write-once" ON storage.objects AS RESTRICTIVE
FOR UPDATE TO authenticated USING (bucket_id NOT IN ('xrag-transfers', 'xrag-prepared'))
WITH CHECK (bucket_id NOT IN ('xrag-transfers', 'xrag-prepared'));
CREATE POLICY "XRAG transfer removal requires server cleanup" ON storage.objects AS RESTRICTIVE
FOR DELETE TO authenticated USING (bucket_id NOT IN ('xrag-transfers', 'xrag-prepared'));
