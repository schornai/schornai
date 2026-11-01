-- This view previously ran as its owner and exposed every workspace's search
-- index through PostgREST, bypassing the underlying tables' RLS policies.
ALTER VIEW public.text_searches_with_sources SET (security_invoker = true);

-- Browser/API roles never need DDL-like privileges. TRUNCATE is not subject to
-- RLS; keep table administration available only to trusted server/database roles.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

-- The URL lookup reads Vault as postgres. No browser or anonymous caller needs
-- this internal helper. Trigger functions likewise have no public RPC use.
ALTER FUNCTION public.supabase_url() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.supabase_url() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- Shared activity logs use only the activity ID. Enforce their unique parent
-- even for server persistence that writes directly instead of using the RPC.
-- Preflight existing installations without deleting or reassigning any data.
DO $check$
BEGIN
  IF EXISTS (
    SELECT substring(document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_') AS activity_id
    FROM public.realtime_documents
    GROUP BY activity_id
    HAVING substring(document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_') IS NOT NULL
      AND count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Security migration blocked: an activity ID has multiple chat/transcription parents'
      USING HINT = 'Run supabase/diagnostics/activity_parent_conflicts.sql and resolve the affected activity ownership before retrying. No data is automatically deleted.';
  END IF;
END;
$check$;
CREATE UNIQUE INDEX realtime_documents_activity_id_key ON public.realtime_documents
  ((substring(document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_')));

-- A document and its initial ACL must commit together. Otherwise a concurrent
-- request can claim another user's chat, or a failed ACL insert leaves an orphan.
-- Only a trusted server may call this with already-authenticated user IDs.
CREATE FUNCTION public.ensure_realtime_document(p_document_name text, p_user_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_document_id uuid;
  v_activity_id text;
BEGIN
  IF p_document_name IS NULL OR length(p_document_name) = 0
    OR p_user_ids IS NULL OR cardinality(p_user_ids) = 0
    OR array_position(p_user_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid document owner' USING ERRCODE = '22023';
  END IF;

  -- Activity storage is keyed by activity ID alone. Claim that ID across all
  -- agent/transcriber parents before inserting to prevent storage aliasing.
  v_activity_id := substring(p_document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_');
  IF v_activity_id IS NOT NULL THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('realtime_activity:' || v_activity_id, 0));
    IF EXISTS (
      SELECT 1 FROM public.realtime_documents
      WHERE document_name <> p_document_name
        AND substring(document_name FROM '^(?:activity_chat___|activity_transcription__)([^_]+)_') = v_activity_id
    ) THEN
      RAISE EXCEPTION 'Activity already exists' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.realtime_documents (document_name)
  VALUES (p_document_name)
  ON CONFLICT (document_name) DO NOTHING
  RETURNING id INTO v_document_id;

  IF v_document_id IS NOT NULL THEN
    INSERT INTO public.realtime_document_access (document_id, user_id)
    SELECT v_document_id, user_id FROM (SELECT DISTINCT unnest(p_user_ids) AS user_id) AS owners;
  ELSE
    SELECT id INTO STRICT v_document_id FROM public.realtime_documents
    WHERE document_name = p_document_name;
    IF EXISTS (
      SELECT 1 FROM unnest(p_user_ids) AS requested(user_id)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.realtime_document_access AS access
        WHERE access.document_id = v_document_id AND access.user_id = requested.user_id
      )
    ) THEN
      RAISE EXCEPTION 'Document access denied' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN v_document_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.ensure_realtime_document(text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_realtime_document(text, uuid[]) TO service_role;

-- Pin all application functions to trusted schemas and place temporary objects
-- last. Keep pgvector's functions/operators out of the exposed API schema.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER EXTENSION vector SET SCHEMA extensions;
ALTER FUNCTION public.can_access(uuid, uuid, text, text) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.can_view_endpoint(text, text) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.custom_access_token_hook(jsonb) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.generate_custom_id() SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.get_parent_folders(text) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.update__text_searches__text_search_vector() SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_384(text, double precision, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_768(text, double precision, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_1024(text, double precision, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_1536(text, double precision, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_384_v2(text, double precision, integer, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_768_v2(text, double precision, integer, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_1024_v2(text, double precision, integer, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.match_embeddings_1536_v2(text, double precision, integer, integer, extensions.vector) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.decrement_current_streams(uuid, text) SET search_path = pg_catalog, public, extensions, pg_temp;
ALTER FUNCTION public.upsert_current_streams(uuid, text) SET search_path = pg_catalog, public, extensions, pg_temp;
