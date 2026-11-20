-- Server-only identity map. Callers authorize the exact workspace before using
-- a service client. Native objects use a deterministic global ID; imported ones
-- retain their original ID independently of the local resource ID.
CREATE TABLE public.xrag_resource_origins (
  workspace_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('agent', 'transcriber', 'documentRepository','automation')),
  origin_id text NOT NULL CHECK (length(origin_id) BETWEEN 1 AND 200 AND origin_id ~ '^[a-z0-9/_-]+$'),
  local_id text NOT NULL,
  PRIMARY KEY (workspace_id, kind, origin_id),
  UNIQUE (workspace_id, origin_id),
  UNIQUE (kind, local_id)
);
ALTER TABLE public.xrag_resource_origins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.xrag_resource_origins FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.xrag_resource_origins TO service_role;

-- The opaque revision is used by import previews. Confirmation never silently
-- overwrites edits made since that preview. No row data or secrets are returned.
CREATE FUNCTION public.xrag_resource_revision(p_kind text, p_id text, p_workspace_id text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE table_name text; saved jsonb;
BEGIN
  IF p_kind = 'automation' THEN
    SELECT to_jsonb(a) INTO saved FROM public.automations a JOIN public.chatbots c ON c.id=a.agent_id WHERE a.id::text=p_id AND c.organization_id=p_workspace_id;
    IF saved IS NULL AND EXISTS(SELECT 1 FROM public.automations WHERE id::text=p_id) THEN RAISE EXCEPTION 'XRAG_WORKSPACE_MISMATCH'; END IF;
    RETURN CASE WHEN saved IS NULL THEN NULL ELSE pg_catalog.md5(saved::text) END;
  END IF;
  table_name := CASE p_kind WHEN 'agent' THEN 'chatbots'
    WHEN 'transcriber' THEN 'transcribers' WHEN 'documentRepository' THEN 'databases' END;
  IF table_name IS NULL THEN RAISE EXCEPTION 'XRAG_INVALID_RESOURCE'; END IF;
  EXECUTE pg_catalog.format('SELECT to_jsonb(r) FROM public.%I r WHERE id = $1', table_name)
    INTO saved USING p_id;
  IF saved IS NULL THEN RETURN NULL; END IF;
  IF saved->>'organization_id' IS DISTINCT FROM p_workspace_id THEN
    RAISE EXCEPTION 'XRAG_WORKSPACE_MISMATCH';
  END IF;
  RETURN pg_catalog.md5(saved::text);
END;
$$;

CREATE FUNCTION public.import_xrag_resources(
  p_workspace_id text, p_entries jsonb, p_new_workspace_name text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE entry jsonb; table_name text; saved jsonb; target_id text; resource_kind text;
  config jsonb; existing_origin text;
BEGIN
  IF pg_catalog.jsonb_typeof(p_entries) IS DISTINCT FROM 'array'
    OR (pg_catalog.jsonb_array_length(p_entries) < 1 AND p_new_workspace_name IS NULL)
    OR pg_catalog.jsonb_array_length(p_entries) > 1000 THEN
    RAISE EXCEPTION 'XRAG_IMPORT_ENTRY_LIMIT';
  END IF;
  IF p_new_workspace_name IS NOT NULL THEN
    IF pg_catalog.length(pg_catalog.btrim(p_new_workspace_name)) = 0 THEN
      RAISE EXCEPTION 'XRAG_INVALID_WORKSPACE';
    END IF;
    INSERT INTO public.organizations(id, name, description, auto_join)
      VALUES(p_workspace_id, p_new_workspace_name, '', false);
  END IF;
  -- Serialize imports for this workspace, including first-time origins. Ordinary
  -- editor writes are protected by row locks and the preview revision below.
  PERFORM 1 FROM public.organizations WHERE id = p_workspace_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'XRAG_INVALID_WORKSPACE'; END IF;
  FOR entry IN SELECT value FROM pg_catalog.jsonb_array_elements(p_entries) ORDER BY (value->>'kind' = 'automation') LOOP
    resource_kind := entry->>'kind'; target_id := entry->>'localId'; config := entry->'config';
    table_name := CASE resource_kind WHEN 'agent' THEN 'chatbots'
      WHEN 'transcriber' THEN 'transcribers' WHEN 'documentRepository' THEN 'databases' WHEN 'automation' THEN 'automations' END;
    IF table_name IS NULL OR target_id IS NULL OR target_id = ''
      OR pg_catalog.jsonb_typeof(config) IS DISTINCT FROM 'object'
      OR entry->>'originId' IS NULL THEN RAISE EXCEPTION 'XRAG_INVALID_RESOURCE'; END IF;
    EXECUTE pg_catalog.format('SELECT to_jsonb(r) FROM public.%I r WHERE id::text = $1 FOR UPDATE', table_name)
      INTO saved USING target_id;
    IF saved IS NOT NULL AND resource_kind <> 'automation' AND saved->>'organization_id' IS DISTINCT FROM p_workspace_id THEN
      RAISE EXCEPTION 'XRAG_WORKSPACE_MISMATCH';
    END IF;
    IF (CASE WHEN saved IS NULL THEN NULL ELSE pg_catalog.md5(saved::text) END)
      IS DISTINCT FROM entry->>'expectedRevision' THEN
      RAISE EXCEPTION 'XRAG_IMPORT_CONFLICT';
    END IF;
    SELECT origin_id INTO existing_origin FROM public.xrag_resource_origins
      WHERE xrag_resource_origins.kind = resource_kind AND local_id = target_id;
    IF existing_origin IS NOT NULL AND existing_origin <> (entry->>'originId') THEN
      RAISE EXCEPTION 'XRAG_IDENTITY_CONFLICT';
    END IF;
    IF resource_kind = 'agent' THEN
      PERFORM public.save_agent_with_mcp_credentials(target_id, p_workspace_id,
        entry->>'name', COALESCE(entry->>'description', ''), config,
        CASE WHEN saved IS NULL THEN NULL ELSE p_workspace_id END);
    ELSIF resource_kind = 'automation' THEN
      -- Personal definitions stay owned by the authenticated importer. An origin
      -- collision never permits taking over another user's automation.
      IF saved IS NOT NULL AND saved->>'user_id' IS DISTINCT FROM config->>'userId' THEN
        RAISE EXCEPTION 'NOT_AUTHORIZED';
      END IF;
      PERFORM 1 FROM public.chatbots WHERE id = entry->'config'->>'agentId' AND organization_id = p_workspace_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'XRAG_REFERENCE_UNAVAILABLE'; END IF;
      IF config->'trigger'->>'type' = 'storage' THEN
        IF config->'trigger'->'storage'->>'type' <> 'documentRepository' THEN
          RAISE EXCEPTION 'XRAG_INSTALLATION_BOUND_CONFIGURATION';
        END IF;
        PERFORM 1 FROM public.databases WHERE id = entry->'config'->'trigger'->'storage'->>'documentRepositoryId' AND organization_id = p_workspace_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'XRAG_REFERENCE_UNAVAILABLE'; END IF;
      END IF;
      INSERT INTO public.automations(id,user_id,agent_id,name,description,color,icon,message,enabled,trigger,next_run_at,storage_bucket,storage_prefix,access_level)
      VALUES(target_id::uuid,(config->>'userId')::uuid,config->>'agentId',entry->>'name',COALESCE(entry->>'description',''),
        config->'color',config->'icon',config->>'message',(config->>'enabled')::boolean,config->'trigger',(config->>'nextRunAt')::timestamptz,
        CASE WHEN config->'trigger'->>'type'='storage' THEN 'database_files' END,
        CASE WHEN config->'trigger'->>'type'='storage' THEN p_workspace_id || '/' || (config->'trigger'->'storage'->>'documentRepositoryId') || '/' END, COALESCE(config->>'accessLevel','workspace'))
      ON CONFLICT (id) DO UPDATE SET agent_id=EXCLUDED.agent_id,name=EXCLUDED.name,description=EXCLUDED.description,color=EXCLUDED.color,icon=EXCLUDED.icon,
        access_level=EXCLUDED.access_level,message=EXCLUDED.message,enabled=EXCLUDED.enabled,trigger=EXCLUDED.trigger,next_run_at=EXCLUDED.next_run_at,
        storage_bucket=EXCLUDED.storage_bucket,storage_prefix=EXCLUDED.storage_prefix,revision=gen_random_uuid(),updated_at=now();
    ELSIF resource_kind = 'transcriber' THEN
      IF saved IS NULL THEN
        INSERT INTO public.transcribers(id, organization_id, name, description, prompt, config)
          VALUES(target_id, p_workspace_id, entry->>'name', entry->>'description', entry->>'prompt', config);
      ELSE
        UPDATE public.transcribers SET name = entry->>'name', description = entry->>'description',
          prompt = entry->>'prompt', config = entry->'config', ai_model_id = NULL WHERE id = target_id;
      END IF;
    ELSE
      IF saved IS NULL THEN
        INSERT INTO public.databases(id, organization_id, name, description, config)
          VALUES(target_id, p_workspace_id, entry->>'name', COALESCE(entry->>'description', ''), config);
      ELSE
        UPDATE public.databases SET name = entry->>'name', description = COALESCE(entry->>'description', ''),
          config = entry->'config' WHERE id = target_id;
      END IF;
    END IF;
    INSERT INTO public.xrag_resource_origins(workspace_id, kind, origin_id, local_id)
      VALUES(p_workspace_id, resource_kind, (entry->>'originId'), target_id)
      ON CONFLICT (workspace_id, kind, origin_id) DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.xrag_resource_origins o WHERE
      o.workspace_id = p_workspace_id AND o.kind = resource_kind AND
      o.origin_id = (entry->>'originId') AND o.local_id = target_id) THEN
      RAISE EXCEPTION 'XRAG_IDENTITY_CONFLICT';
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.xrag_resource_revision(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.import_xrag_resources(text,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.xrag_resource_revision(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.import_xrag_resources(text,jsonb,text) TO service_role;

-- Keep imported identities attached to their object when an editor moves it.
-- The trigger is the only privileged part: callers already passed the resource's
-- UPDATE policies, and cannot read or edit the private map themselves.
CREATE FUNCTION public.move_xrag_resource_origin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.xrag_resource_origins
    SET workspace_id = NEW.organization_id
    WHERE kind = TG_ARGV[0] AND local_id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.move_xrag_resource_origin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER move_xrag_agent_origin AFTER UPDATE OF organization_id ON public.chatbots
  FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
  EXECUTE FUNCTION public.move_xrag_resource_origin('agent');
CREATE TRIGGER move_xrag_transcriber_origin AFTER UPDATE OF organization_id ON public.transcribers
  FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
  EXECUTE FUNCTION public.move_xrag_resource_origin('transcriber');
CREATE TRIGGER move_xrag_repository_origin AFTER UPDATE OF organization_id ON public.databases
  FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
  EXECUTE FUNCTION public.move_xrag_resource_origin('documentRepository');

-- Create the agent, its private credentials and its portable identity in one transaction.
CREATE FUNCTION public.create_agent_with_identity(
  p_agent_id text, p_workspace_id text, p_name text, p_description text,
  p_config jsonb, p_global_id text, p_fallback_global_id text DEFAULT NULL,
  p_copy_agent_id text DEFAULT NULL, p_copy_workspace_id text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM public.save_agent_with_mcp_credentials(
    p_agent_id, p_workspace_id, p_name, p_description, p_config,
    NULL, p_copy_agent_id, p_copy_workspace_id
  );
  INSERT INTO public.xrag_resource_origins(workspace_id, kind, local_id, origin_id)
  VALUES (p_workspace_id, 'agent', p_agent_id, p_global_id)
  ON CONFLICT (workspace_id, origin_id) DO NOTHING;
  IF NOT FOUND THEN
    IF p_fallback_global_id IS NULL THEN
      RAISE EXCEPTION 'XRAG_IDENTITY_EXISTS';
    END IF;
    INSERT INTO public.xrag_resource_origins(workspace_id, kind, local_id, origin_id)
    VALUES (p_workspace_id, 'agent', p_agent_id, p_fallback_global_id);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.create_agent_with_identity(text,text,text,text,jsonb,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_with_identity(text,text,text,text,jsonb,text,text,text,text) TO service_role;

-- Storage is not transactional with Postgres. Reserve affected paths, keep
-- immutable undo copies, and publish metadata/outbox only after all files exist.
CREATE TABLE public.xrag_import_transactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  token uuid NOT NULL,
  state text NOT NULL DEFAULT 'preparing' CHECK (state IN ('preparing','applying','committed','rolling_back','rolled_back')),
  plan jsonb NOT NULL,
  result jsonb,
  files_applied boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  created_at timestamptz NOT NULL DEFAULT now(),
  cleaned_at timestamptz
);
ALTER TABLE public.xrag_import_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.xrag_import_transactions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.xrag_import_transactions TO service_role;
CREATE INDEX xrag_import_recovery ON public.xrag_import_transactions(expires_at) WHERE cleaned_at IS NULL;
-- Storage's internal copy/upload transaction preserves owner_id (JWT sub), but
-- not arbitrary JWT claims. Keep attempt subjects to fence late completions.
CREATE TABLE public.xrag_import_storage_tokens (
  token uuid PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES public.xrag_import_transactions(id) ON DELETE CASCADE
);
CREATE INDEX xrag_import_storage_tokens_import ON public.xrag_import_storage_tokens(import_id);
ALTER TABLE public.xrag_import_storage_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.xrag_import_storage_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.xrag_import_storage_tokens TO service_role;
CREATE FUNCTION public.record_xrag_import_storage_token() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.xrag_import_storage_tokens(token,import_id) VALUES(NEW.token,NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_xrag_import_storage_token() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_xrag_import_storage_token AFTER INSERT OR UPDATE OF token ON public.xrag_import_transactions
FOR EACH ROW EXECUTE FUNCTION public.record_xrag_import_storage_token();
CREATE TABLE public.xrag_import_reservations (
  path text PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES public.xrag_import_transactions(id) ON DELETE CASCADE
);
CREATE INDEX xrag_import_reservations_import ON public.xrag_import_reservations(import_id);
ALTER TABLE public.xrag_import_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.xrag_import_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.xrag_import_reservations TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES ('xrag-import-staging','xrag-import-staging',false,214748364800);

CREATE FUNCTION public.xrag_import_base_path(p_path text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT pg_catalog.regexp_replace(p_path, '\.__xrag_(content\.mdc|transcript\.json|text_write\.json)$', '');
$$;
-- Serialize ordinary Storage mutations/processing leases with import reservation.
-- Trusted import/recovery workers use service_role; browser clients cannot bypass.
CREATE FUNCTION public.guard_xrag_import_file() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE bucket text; path text; owner uuid; import_claim text := auth.jwt()->>'xrag_import_id'; attempt_token text := auth.jwt()->>'xrag_import_token';
BEGIN
  IF TG_TABLE_SCHEMA = 'storage' THEN
    bucket := CASE WHEN TG_OP = 'DELETE' THEN OLD.bucket_id ELSE NEW.bucket_id END;
    path := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
  ELSE
    bucket := NEW.bucket; path := NEW.path;
  END IF;
  IF TG_TABLE_SCHEMA = 'storage' AND TG_OP <> 'DELETE' AND import_claim IS NULL THEN
    SELECT t.import_id::text, t.token::text INTO import_claim, attempt_token
      FROM public.xrag_import_storage_tokens t WHERE t.token::text = NEW.owner_id;
  END IF;
  IF import_claim IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.xrag_import_transactions t WHERE t.id::text = import_claim
      AND t.token::text = attempt_token
      AND t.state IN ('preparing','applying','rolling_back') AND t.expires_at > now()
  ) THEN RAISE EXCEPTION 'XRAG_IMPORT_LEASE_LOST'; END IF;
  IF TG_TABLE_SCHEMA = 'storage' AND TG_OP = 'UPDATE' THEN
    IF OLD.bucket_id = 'database_files' AND (OLD.name IS DISTINCT FROM NEW.name OR OLD.bucket_id IS DISTINCT FROM NEW.bucket_id) THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xrag-file:' || public.xrag_import_base_path(OLD.name), 0));
      IF EXISTS (SELECT 1 FROM public.xrag_import_reservations r WHERE r.path = public.xrag_import_base_path(OLD.name) AND r.import_id::text IS DISTINCT FROM import_claim) THEN
        RAISE EXCEPTION 'XRAG_IMPORT_IN_PROGRESS';
      END IF;
    END IF;
  END IF;
  IF bucket = 'box-action-files' AND EXISTS (
    SELECT 1 FROM public.xrag_import_transactions t WHERE t.state IN ('preparing','applying','rolling_back')
      AND t.id::text IS DISTINCT FROM import_claim
      AND t.plan->'artifacts' @> pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('path',path))
  ) THEN RAISE EXCEPTION 'XRAG_IMPORT_IN_PROGRESS'; END IF;
  IF bucket = 'database_files' THEN
    path := public.xrag_import_base_path(path);
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xrag-file:' || path, 0));
    SELECT r.import_id INTO owner FROM public.xrag_import_reservations r WHERE r.path = path;
    IF (owner IS NOT NULL AND owner::text IS DISTINCT FROM import_claim)
      OR (import_claim IS NOT NULL AND owner IS NULL) THEN
      RAISE EXCEPTION 'XRAG_IMPORT_IN_PROGRESS';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  -- The attempt subject is a transport credential, not the file's owner. Clear
  -- it after checking so later ordinary updates cannot inherit stale credentials.
  IF TG_TABLE_SCHEMA = 'storage' AND import_claim IS NOT NULL THEN
    NEW.owner_id := NULL; NEW.owner := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_xrag_import_file() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_xrag_import_storage BEFORE INSERT OR UPDATE OR DELETE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.guard_xrag_import_file();
CREATE TRIGGER guard_xrag_import_processing BEFORE INSERT OR UPDATE ON public.storage_file_locks
FOR EACH ROW EXECUTE FUNCTION public.guard_xrag_import_file();

CREATE FUNCTION public.begin_xrag_import(p_id uuid, p_token uuid, p_user_id uuid, p_plan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE file jsonb; entry jsonb; path text; files jsonb := '[]';
BEGIN
  INSERT INTO public.xrag_import_transactions(id,token,user_id,plan) VALUES(p_id,p_token,p_user_id,p_plan);
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
  UPDATE public.xrag_import_transactions SET plan = p_plan WHERE id = p_id;
  RETURN p_plan;
END;
$$;
CREATE FUNCTION public.enqueue_automation_storage_event(bucket text, object_name text, event_name text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE relative_path text; folder text; a public.automations; run_id uuid;
BEGIN
  for a in select * from public.automations where enabled and storage_bucket = bucket
    and trigger->>'type' = 'storage' and (trigger->'events') ? event_name
  loop
    if left(object_name, length(a.storage_prefix)) <> a.storage_prefix then continue; end if;
    relative_path := substring(object_name from length(a.storage_prefix) + 1);
    folder := a.trigger->>'folder';
    if folder <> '' then
      if left(relative_path, length(folder) + 1) <> folder || '/' then continue; end if;
    end if;
    if not (a.trigger->>'includeSubfolders')::boolean
      and position('/' in substring(relative_path from case when folder = '' then 1 else length(folder) + 2 end)) > 0 then continue; end if;
    insert into public.automation_runs(automation_id, revision, occurrence, event)
      values (a.id, a.revision, gen_random_uuid()::text, jsonb_build_object('type', event_name, 'path', relative_path)) returning id into run_id;
    insert into public.scheduled_jobs(id, kind, payload, run_at, max_attempts)
      values ('automation.run:' || run_id, 'automation.run', jsonb_build_object('runId', run_id), now(), 100);
  end loop;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_automation_storage_event(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_automation_storage_event(text,text,text) TO service_role;

create or replace function public.capture_automation_storage_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare object_name text; bucket text; event_name text;
begin
  if auth.jwt()->>'xrag_import_id' IS NOT NULL then return null; end if;
  -- Access timestamps and other bookkeeping do not represent new file content.
  -- In particular, reading an attachment must not recursively trigger new runs.
  if TG_OP = 'UPDATE' and new.bucket_id is not distinct from old.bucket_id
    and new.name is not distinct from old.name
    and new.version is not distinct from old.version
    and new.metadata is not distinct from old.metadata
    and new.user_metadata is not distinct from old.user_metadata then return null; end if;
  if TG_OP = 'DELETE' then object_name := old.name; bucket := old.bucket_id; event_name := 'deleted';
  else
    object_name := new.name; bucket := new.bucket_id;
    event_name := case when TG_OP = 'INSERT' then 'uploaded' when old.name is distinct from new.name then 'moved' else 'updated' end;
  end if;
  if bucket not in ('database_files', 'realtime_files') then return null; end if;
  if bucket = 'database_files' and exists (select 1 from public.xrag_import_reservations r where r.path = public.xrag_import_base_path(object_name)) then return null; end if;
  if right(object_name, length('.__xrag_content.mdc')) = '.__xrag_content.mdc' then
    if TG_OP = 'DELETE' then return null; end if;
    object_name := left(object_name, -length('.__xrag_content.mdc')); event_name := 'processed';
  elsif right(object_name, length('.__xrag_transcript.json')) = '.__xrag_transcript.json' or right(object_name, length('.__xrag_text_write.json')) = '.__xrag_text_write.json'
    or object_name like '%/.empty-folder-placeholder' then return null;
  end if;
  PERFORM public.enqueue_automation_storage_event(bucket, object_name, event_name);
  return null;
end $$;

CREATE FUNCTION public.commit_xrag_import(p_id uuid, p_token uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE job public.xrag_import_transactions; entry jsonb; artifact jsonb; publication uuid;
  publications jsonb := '[]'; imported jsonb := '[]'; committed_result jsonb;
BEGIN
  SELECT * INTO STRICT job FROM public.xrag_import_transactions WHERE id = p_id FOR UPDATE;
  IF job.state = 'committed' THEN RETURN job.result; END IF;
  IF job.token <> p_token OR job.state <> 'applying' OR job.expires_at < now() THEN RAISE EXCEPTION 'XRAG_IMPORT_LEASE_LOST'; END IF;
  IF pg_catalog.jsonb_array_length(job.plan->'entries') > 0 OR job.plan->'target'->>'newWorkspaceName' IS NOT NULL THEN
    PERFORM public.import_xrag_resources(job.plan->'target'->>'workspaceId', job.plan->'entries', job.plan->'target'->>'newWorkspaceName');
  END IF;
  FOR entry IN SELECT value FROM pg_catalog.jsonb_array_elements(job.plan->'entries') LOOP
    imported := imported || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('kind',entry->>'kind','originId',entry->>'originId','localId',entry->>'localId'));
  END LOOP;
  -- Index invalidation, publication and processing delivery are part of the same
  -- commit as resource metadata. No worker can observe an uncommitted import.
  DELETE FROM public.sources s USING public.xrag_import_reservations r
    WHERE r.import_id = p_id AND s.url = 'database_files/' || r.path;
  FOR artifact IN SELECT value FROM pg_catalog.jsonb_array_elements(job.plan->'artifacts') LOOP
    INSERT INTO public.artifact_publications(upload_path,name)
    VALUES(artifact->>'path',artifact->>'name') RETURNING id INTO publication;
    publications := publications || pg_catalog.jsonb_build_array(publication);
  END LOOP;
  committed_result := pg_catalog.jsonb_build_object('workspaceId',job.plan->'target'->>'workspaceId',
    'imported',imported,'publications',publications,'documentFileCount',pg_catalog.jsonb_array_length(job.plan->'processing'));
  IF pg_catalog.jsonb_array_length(job.plan->'processing') > 0 THEN
    INSERT INTO public.scheduled_jobs(id,kind,payload,run_at,max_attempts)
    VALUES('xrag:process:' || p_id,'xrag.import.process',pg_catalog.jsonb_build_object('importId',p_id),now(),100);
  END IF;
  FOR entry IN SELECT value FROM pg_catalog.jsonb_array_elements(job.plan->'files') LOOP
    IF entry->>'path' = entry->>'basePath' AND NOT (entry->>'remove')::boolean
      AND entry->>'path' NOT LIKE '%/.empty-folder-placeholder' THEN
      PERFORM public.enqueue_automation_storage_event('database_files', entry->>'path',
        CASE WHEN (entry->>'hadOriginal')::boolean THEN 'updated' ELSE 'uploaded' END);
    END IF;
  END LOOP;
  UPDATE public.xrag_import_transactions SET state = 'committed', expires_at = now(), result = committed_result WHERE id = p_id;
  DELETE FROM public.xrag_import_reservations WHERE import_id = p_id;
  RETURN committed_result;
END;
$$;
CREATE FUNCTION public.finish_xrag_import_rollback(p_id uuid, p_token uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
#variable_conflict use_variable
BEGIN
  UPDATE public.xrag_import_transactions SET state = 'rolled_back', expires_at = now() WHERE id = p_id AND token = p_token AND state = 'rolling_back';
  IF NOT FOUND THEN RAISE EXCEPTION 'XRAG_IMPORT_LEASE_LOST'; END IF;
  DELETE FROM public.xrag_import_reservations WHERE import_id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.begin_xrag_import(uuid,uuid,uuid,jsonb), public.commit_xrag_import(uuid,uuid), public.finish_xrag_import_rollback(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_xrag_import(uuid,uuid,uuid,jsonb), public.commit_xrag_import(uuid,uuid), public.finish_xrag_import_rollback(uuid,uuid) TO service_role;

-- Keep undo/token records until Storage cleanup and durable processing delivery
-- are terminal. Attempt JWTs expire after ten minutes; retention is 72 hours.
CREATE FUNCTION public.prune_xrag_import_transactions() RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  DELETE FROM public.xrag_import_transactions t
  WHERE t.state IN ('committed','rolled_back') AND t.cleaned_at < now() - interval '72 hours'
    AND NOT EXISTS (SELECT 1 FROM public.scheduled_jobs j WHERE j.id = 'xrag:process:' || t.id AND j.state IN ('pending','running'));
$$;
REVOKE ALL ON FUNCTION public.prune_xrag_import_transactions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_xrag_import_transactions() TO service_role;

-- An active or recovering import owns its staged model archives, even past 72h.
create or replace function public.expire_artifact_uploads()
returns integer language plpgsql set search_path = '' as $$
declare affected integer; reclaimed integer;
begin
  -- A previously issued signed upload token can outlive early duplicate/error
  -- cleanup. Revisit recreated terminal objects after the same retention window.
  update public.artifact_publications job set cleaned_at = null
    where job.cleaned_at is not null and job.state in ('published', 'error')
      and not exists(select 1 from public.artifact_catalog where object_path = job.upload_path)
      and exists(select 1 from storage.objects object where object.bucket_id = 'box-action-files'
        and object.name = job.upload_path and object.created_at < clock_timestamp() - interval '72 hours'
        and object.updated_at < clock_timestamp() - interval '72 hours');
  get diagnostics reclaimed = row_count;
  insert into public.artifact_publications (upload_path, name, state, error_code)
    select object.name, split_part(object.name, '/', -1), 'error', 'XRAG_UPLOAD_EXPIRED'
    from storage.objects object
    where object.bucket_id = 'box-action-files'
      and object.created_at < clock_timestamp() - interval '72 hours'
      and object.updated_at < clock_timestamp() - interval '72 hours'
      and (object.name like 'uploads/%' or object.name like 'staging/%' or object.name not like '%/%' or object.name ~ '^artifacts/[a-f0-9]{64}\.tar$')
      and not exists(select 1 from public.xrag_import_transactions t where t.cleaned_at is null
        and t.plan->'artifacts' @> jsonb_build_array(jsonb_build_object('path',object.name)))
      and not exists(select 1 from public.artifact_catalog where object_path = object.name)
      and not exists(select 1 from public.artifact_publications where upload_path = object.name)
    order by object.created_at limit 100
    on conflict (upload_path) do nothing;
  get diagnostics affected = row_count;
  return affected + reclaimed;
end;
$$;

-- Deleting/moving an existing repository while its files are reserved would make
-- recovery restore bytes under an orphaned path. Ordinary configuration edits
-- remain protected by the preview revision checked at commit.
CREATE FUNCTION public.guard_xrag_import_repository() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xrag-repository:' || OLD.organization_id || '/' || OLD.id, 0));
  IF EXISTS (SELECT 1 FROM public.xrag_import_reservations r
    WHERE pg_catalog.left(r.path, pg_catalog.length(OLD.organization_id || '/' || OLD.id || '/')) = OLD.organization_id || '/' || OLD.id || '/') THEN
    RAISE EXCEPTION 'XRAG_IMPORT_IN_PROGRESS';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_xrag_import_repository() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_xrag_import_repository_delete BEFORE DELETE ON public.databases
FOR EACH ROW EXECUTE FUNCTION public.guard_xrag_import_repository();
CREATE TRIGGER guard_xrag_import_repository_move BEFORE UPDATE OF organization_id ON public.databases
FOR EACH ROW WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
EXECUTE FUNCTION public.guard_xrag_import_repository();

INSERT INTO storage.buckets(id, name, public, file_size_limit)
VALUES ('xrag-transfers', 'xrag-transfers', false, 214748364800);

CREATE POLICY "XRAG transfer owner upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'xrag-transfers'
  AND public.authorize('workspace-admin'::public.user_role)
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$'
);
CREATE POLICY "XRAG transfer owner read" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'xrag-transfers'
  AND public.authorize('workspace-admin'::public.user_role)
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

-- Ready upload contents, not another job queue. Only trusted preparation writes
-- this immutable inventory after every child/file has been stored successfully.
CREATE TABLE public.xrag_prepared_uploads (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  source_path text NOT NULL UNIQUE,
  name text NOT NULL,
  size bigint NOT NULL CHECK (size > 0),
  digest text NOT NULL,
  prefix text NOT NULL,
  entries jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX xrag_prepared_uploads_owner ON public.xrag_prepared_uploads(user_id,created_at);
ALTER TABLE public.xrag_prepared_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.xrag_prepared_uploads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.xrag_prepared_uploads TO authenticated;
GRANT ALL ON public.xrag_prepared_uploads TO service_role;
CREATE POLICY "Read own prepared XRAG uploads" ON public.xrag_prepared_uploads
FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) AND public.authorize('workspace-admin'::public.user_role));
INSERT INTO storage.buckets(id,name,public,file_size_limit)
VALUES ('xrag-prepared','xrag-prepared',false,214748364800);

CREATE FUNCTION public.expired_xrag_prepared_uploads() RETURNS TABLE(source_path text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT u.source_path FROM public.xrag_prepared_uploads u
  WHERE u.created_at < now() - interval '1 hour'
    AND NOT EXISTS (SELECT 1 FROM public.xrag_import_transactions t
      WHERE t.plan->'source'->>'path' = u.source_path AND t.state IN ('preparing','applying','rolling_back'))
  ORDER BY u.created_at LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.expired_xrag_prepared_uploads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expired_xrag_prepared_uploads() TO service_role;

-- Inventory cleanup owns referenced bytes, including those held by recovery.
-- A preparation starts on an upload under one hour old and lasts at most 24h.
-- The longer orphan grace period protects attempts before inventory publication.
CREATE FUNCTION public.expired_xrag_transfers() RETURNS TABLE(name text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'xrag-transfers' AND o.updated_at < now() - interval '72 hours'
    AND NOT EXISTS (SELECT 1 FROM public.xrag_prepared_uploads u WHERE u.source_path = o.name)
  ORDER BY o.updated_at LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.expired_xrag_transfers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expired_xrag_transfers() TO service_role;

CREATE FUNCTION public.expired_xrag_prepared_objects() RETURNS TABLE(name text)
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'xrag-prepared' AND o.updated_at < now() - interval '72 hours'
    AND NOT EXISTS (SELECT 1 FROM public.xrag_prepared_uploads u WHERE pg_catalog.starts_with(o.name, u.prefix || '/'))
  ORDER BY o.updated_at LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.expired_xrag_prepared_objects() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expired_xrag_prepared_objects() TO service_role;

-- Personal export selections. Resource access is checked again when exporting.
CREATE TABLE public.xrag_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX xrag_packages_owner_idx ON public.xrag_packages(owner_id);
CREATE TABLE public.xrag_package_items (
  package_id uuid NOT NULL REFERENCES public.xrag_packages(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('agent','transcriber','documentRepository','automation','model')),
  resource_id text NOT NULL CHECK (length(resource_id) BETWEEN 1 AND 200),
  name text NOT NULL,
  PRIMARY KEY (package_id, kind, resource_id)
);
ALTER TABLE public.xrag_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xrag_package_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.xrag_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xrag_package_items TO authenticated;
GRANT ALL ON public.xrag_packages, public.xrag_package_items TO service_role;
CREATE POLICY "Manage own XRAG packages" ON public.xrag_packages FOR ALL TO authenticated
USING (owner_id = (SELECT auth.uid()) AND public.authorize('workspace-admin'::public.user_role))
WITH CHECK (owner_id = (SELECT auth.uid()) AND public.authorize('workspace-admin'::public.user_role));
CREATE POLICY "Manage own XRAG package items" ON public.xrag_package_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.xrag_packages p WHERE p.id = package_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.xrag_packages p WHERE p.id = package_id));

-- Durable exports follow the artifact publication lease/retry protocol.
create table public.xrag_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id uuid references public.xrag_packages(id) on delete set null,
  name text not null,
  selections jsonb not null check (jsonb_typeof(selections) = 'array' and jsonb_array_length(selections) between 1 and 1000),
  claims jsonb not null,
  state text not null default 'queued' check (state in ('queued','processing','finished','error','cancelled')),
  owner_token uuid,
  lease_until timestamptz,
  attempts integer not null default 0,
  retry_at timestamptz not null default now(),
  bytes_uploaded bigint not null default 0 check (bytes_uploaded >= 0),
  total_bytes bigint check (total_bytes > 0),
  object_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'processing') = (owner_token is not null and lease_until is not null)),
  check ((state = 'finished') = (object_path is not null))
);
alter table public.xrag_export_jobs enable row level security;
revoke all on public.xrag_export_jobs from public, anon, authenticated;
grant select (id,user_id,package_id,name,state,attempts,bytes_uploaded,total_bytes,created_at,updated_at) on public.xrag_export_jobs to authenticated;
grant all on public.xrag_export_jobs to service_role;
create policy xrag_export_owner_read on public.xrag_export_jobs for select to authenticated using (user_id = (select auth.uid()));
create index xrag_export_work on public.xrag_export_jobs(retry_at,created_at) where state in ('queued','processing');
create index xrag_export_owner on public.xrag_export_jobs(user_id,created_at desc);
create unique index xrag_export_one_active_package on public.xrag_export_jobs(user_id,package_id) where state in ('queued','processing');

create function public.claim_xrag_export(p_owner_token uuid)
returns setof public.xrag_export_jobs language plpgsql set search_path = '' as $$
begin
  update public.xrag_export_jobs set state='error',owner_token=null,lease_until=null,updated_at=clock_timestamp()
    where attempts >= 5 and (state='queued' or (state='processing' and lease_until < clock_timestamp()));
  return query update public.xrag_export_jobs as job
    set state='processing',owner_token=p_owner_token,lease_until=clock_timestamp()+interval '90 seconds',attempts=attempts+1,bytes_uploaded=0,total_bytes=null,updated_at=clock_timestamp()
    where job.id=(select candidate.id from public.xrag_export_jobs candidate
      where (candidate.state='queued' and candidate.retry_at <= clock_timestamp()) or (candidate.state='processing' and candidate.lease_until < clock_timestamp())
      order by candidate.created_at limit 1 for update skip locked)
    returning job.*;
end;
$$;

-- Lease renewal, progress and completion all fence stale owners. Publishing the
-- download path and finishing the job must be the same transaction.
create function public.update_xrag_export(p_id uuid,p_owner_token uuid,p_state text default 'processing',p_bytes bigint default 0,p_total bigint default null,p_path text default null)
returns boolean language plpgsql set search_path = '' as $$
begin
  if p_state not in ('processing','finished','queued','error') then raise exception 'XRAG_INVALID_STATE'; end if;
  if p_state='finished' and (p_total is null or p_bytes<>p_total or p_path is null) then raise exception 'XRAG_INVALID_RESULT'; end if;
  update public.xrag_export_jobs set state=p_state,
    owner_token=case when p_state='processing' then p_owner_token else null end,
    lease_until=case when p_state='processing' then clock_timestamp()+interval '90 seconds' else null end,
    bytes_uploaded=p_bytes,total_bytes=p_total,object_path=p_path,
    retry_at=clock_timestamp()+interval '30 seconds'*attempts,updated_at=clock_timestamp()
    where id=p_id and state='processing' and owner_token=p_owner_token and lease_until>clock_timestamp()
      and (p_path is null or p_path like user_id::text || '/' || p_owner_token::text || '/%');
  return found;
end;
$$;
revoke all on function public.claim_xrag_export(uuid) from public,anon,authenticated;
revoke all on function public.update_xrag_export(uuid,uuid,text,bigint,bigint,text) from public,anon,authenticated;
grant execute on function public.claim_xrag_export(uuid) to service_role;
grant execute on function public.update_xrag_export(uuid,uuid,text,bigint,bigint,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit) values('xrag-exports','xrag-exports',false,214748364800);
-- Export bytes remain worker-private until completion and a fresh permission
-- check. No authenticated Storage policy exposes unfinished/failed attempts.
create function public.expired_xrag_exports()
returns table(name text) language sql set search_path='' as $$
  select o.name from storage.objects o left join public.xrag_export_jobs j on j.object_path=o.name
  where o.bucket_id='xrag-exports'
    and coalesce(j.updated_at,o.updated_at) < clock_timestamp()-interval '72 hours'
    and not exists(select 1 from public.xrag_export_jobs active where active.state='processing' and active.lease_until>clock_timestamp() and (storage.foldername(o.name))[2]=active.owner_token::text)
  order by o.updated_at limit 100;
$$;
revoke all on function public.expired_xrag_exports() from public,anon,authenticated;
grant execute on function public.expired_xrag_exports() to service_role;
