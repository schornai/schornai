-- Run with psql -v ON_ERROR_STOP=1 against a migrated local database.
-- All fixture data is rolled back. No user database reset is required.
BEGIN;
INSERT INTO public.organizations (id, name, description)
VALUES ('security-own', 'Own', ''), ('security-other', 'Other', '');
INSERT INTO public.databases (id, name, description, organization_id, config)
VALUES ('security-own', 'Own', '', 'security-own', '{}'), ('security-other', 'Other', '', 'security-other', '{}');
INSERT INTO public.sources (id, url, mime_type, database_id, name)
VALUES ('security-own', 'own', 'text/plain', 'security-own', 'Own'), ('security-other', 'other', 'text/plain', 'security-other', 'Other');
INSERT INTO public.source_objects (id, content, source_id)
VALUES ('security-own', 'own secret', 'security-own'), ('security-other', 'other secret', 'security-other');
INSERT INTO public.text_searches (id, text_search_vector, object_id, database_id)
VALUES ('security-own', to_tsvector('own secret'), 'security-own', 'security-own'),
       ('security-other', to_tsvector('other secret'), 'security-other', 'security-other');

SET LOCAL ROLE anon;
DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM public.text_searches_with_sources WHERE id LIKE 'security-%') THEN
    RAISE EXCEPTION 'Anonymous search index disclosure';
  END IF;
END;
$test$;

-- Exercise the relocated vector operator and pinned function path with RLS.
SELECT * FROM public.match_embeddings_384_v2(
  'security-own', 0, 0, 10, array_fill(0::real, ARRAY[384])::extensions.vector
) AS result(object_id text, product double precision);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"organization_roles":[{"organization_id":"security-own","role":"user"}]}', true);
DO $test$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.text_searches_with_sources WHERE id = 'security-own')
    OR EXISTS (SELECT 1 FROM public.text_searches_with_sources WHERE id = 'security-other') THEN
    RAISE EXCEPTION 'Search view does not enforce workspace RLS';
  END IF;
END;
$test$;
RESET ROLE;

DO $test$
DECLARE
  api_role text;
  table_name text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
      IF has_table_privilege(api_role, format('public.%I', table_name), 'TRUNCATE') THEN
        RAISE EXCEPTION 'RLS-bypassing TRUNCATE granted to % on %', api_role, table_name;
      END IF;
      IF current_setting('server_version_num')::integer >= 170000 THEN
        IF has_table_privilege(api_role, format('public.%I', table_name), 'MAINTAIN') THEN
          RAISE EXCEPTION 'Table maintenance granted to % on %', api_role, table_name;
        END IF;
      END IF;
    END LOOP;
    IF has_function_privilege(api_role, 'public.supabase_url()', 'EXECUTE')
      OR has_function_privilege(api_role, 'public.handle_new_user()', 'EXECUTE')
      OR has_function_privilege(api_role, 'public.custom_access_token_hook(jsonb)', 'EXECUTE')
      OR has_function_privilege(api_role, 'public.ensure_realtime_document(text,uuid[])', 'EXECUTE') THEN
      RAISE EXCEPTION 'Internal function exposed to %', api_role;
    END IF;
  END LOOP;
END;
$test$;

INSERT INTO auth.users (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
SET LOCAL ROLE service_role;
DO $test$
DECLARE
  own_id uuid := '11111111-1111-4111-8111-111111111111';
  other_id uuid := '22222222-2222-4222-8222-222222222222';
  doc_id uuid;
BEGIN
  doc_id := public.ensure_realtime_document('security-test-chat', ARRAY[own_id]);
  IF public.ensure_realtime_document('security-test-chat', ARRAY[own_id]) <> doc_id THEN
    RAISE EXCEPTION 'Existing owner must be able to reopen the document';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.realtime_document_access WHERE document_id = doc_id AND user_id = own_id) THEN
    RAISE EXCEPTION 'Document missing its initial ACL';
  END IF;
  BEGIN
    PERFORM public.ensure_realtime_document('security-test-chat', ARRAY[other_id]);
    RAISE EXCEPTION 'Another user claimed an existing chat';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.ensure_realtime_document('security-test-chat', ARRAY[own_id, other_id]);
    RAISE EXCEPTION 'Existing owner widened the ACL';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.ensure_realtime_document('security-test-invalid', ARRAY['33333333-3333-4333-8333-333333333333'::uuid]);
    RAISE EXCEPTION 'Nonexistent owner accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.realtime_documents WHERE document_name = 'security-test-invalid') THEN
    RAISE EXCEPTION 'Failed ACL insert left a document behind';
  END IF;
  PERFORM public.ensure_realtime_document('activity_chat___security-activity_agent-a', ARRAY[own_id]);
  BEGIN
    PERFORM public.ensure_realtime_document('activity_chat___security-activity_agent-b', ARRAY[other_id]);
    RAISE EXCEPTION 'Activity ID reused under a different agent';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.ensure_realtime_document('activity_transcription__security-activity_transcriber', ARRAY[other_id]);
    RAISE EXCEPTION 'Activity ID reused across activity types';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.realtime_documents (document_name)
    VALUES ('activity_transcription__security-activity_direct-insert');
    RAISE EXCEPTION 'Direct persistence bypassed the unique activity owner';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END;
$test$;
RESET ROLE;
ROLLBACK;
