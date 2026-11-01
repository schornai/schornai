-- Run with psql -v ON_ERROR_STOP=1 against a migrated local Supabase database.
-- All fixtures and changes are rolled back, including on a failed assertion.
BEGIN;

INSERT INTO public.organizations (id, name, description)
VALUES ('transcriber-permissions-own', 'Permission test', ''),
       ('transcriber-permissions-other', 'Other workspace', '');
INSERT INTO public.transcribers (id, name, description, organization_id, config)
VALUES ('transcriber-permissions-own', 'Own transcriber', '', 'transcriber-permissions-own', '{}'),
       ('transcriber-permissions-other', 'Other transcriber', '', 'transcriber-permissions-other', '{}');

SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  member_role text;
  required_role public.user_role;
  expected boolean;
  affected integer;
  claims jsonb;
BEGIN
  FOREACH member_role IN ARRAY ARRAY['user', 'editor', 'workspace-admin', 'admin'] LOOP
    claims := CASE WHEN member_role = 'admin' THEN '"admin"'::jsonb ELSE
      jsonb_build_array(jsonb_build_object('organization_id', 'transcriber-permissions-own', 'role', member_role)) END;
    PERFORM set_config('request.jwt.claims', jsonb_build_object('organization_roles', claims)::text, true);

    FOREACH required_role IN ARRAY ARRAY['user', 'editor', 'workspace-admin', 'admin']::public.user_role[] LOOP
      expected := member_role = 'admin'
        OR required_role = 'user'
        OR (required_role = 'editor' AND member_role IN ('editor', 'workspace-admin'))
        OR (required_role = 'workspace-admin' AND member_role = 'workspace-admin');
      IF public.authorize(required_role, 'transcriber-permissions-own') IS DISTINCT FROM expected
        OR public.authorize(required_role) IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Incorrect permission % for %', required_role, member_role;
      END IF;
      IF public.authorize(required_role, 'transcriber-permissions-other') IS DISTINCT FROM (member_role = 'admin') THEN
        RAISE EXCEPTION 'Incorrect cross-workspace permission % for %', required_role, member_role;
      END IF;
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM public.transcribers WHERE id = 'transcriber-permissions-own') THEN
      RAISE EXCEPTION '% cannot read its transcriber for chatting', member_role;
    END IF;
    IF EXISTS (SELECT 1 FROM public.transcribers WHERE id = 'transcriber-permissions-other') <> (member_role = 'admin') THEN
      RAISE EXCEPTION 'Incorrect cross-workspace transcriber visibility for %', member_role;
    END IF;

    UPDATE public.transcribers SET name = 'Updated' WHERE id = 'transcriber-permissions-own';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> (CASE WHEN member_role IN ('workspace-admin', 'admin') THEN 1 ELSE 0 END) THEN
      RAISE EXCEPTION 'Incorrect update permission for %', member_role;
    END IF;

    BEGIN
      INSERT INTO public.transcribers (id, name, description, organization_id, config)
      VALUES ('transcriber-permissions-created', 'Created', '', 'transcriber-permissions-own', '{}');
      IF member_role NOT IN ('workspace-admin', 'admin') THEN
        RAISE EXCEPTION '% must not create transcribers', member_role;
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      IF member_role IN ('workspace-admin', 'admin') THEN RAISE; END IF;
    END;

    DELETE FROM public.transcribers WHERE id = 'transcriber-permissions-own';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> (CASE WHEN member_role IN ('workspace-admin', 'admin') THEN 1 ELSE 0 END) THEN
      RAISE EXCEPTION 'Incorrect delete permission for %', member_role;
    END IF;
    IF affected = 1 THEN
      INSERT INTO public.transcribers (id, name, description, organization_id, config)
      VALUES ('transcriber-permissions-own', 'Own transcriber', '', 'transcriber-permissions-own', '{}');
      DELETE FROM public.transcribers WHERE id = 'transcriber-permissions-created';
    END IF;

    IF member_role <> 'admin' THEN
      UPDATE public.transcribers SET name = 'Forbidden' WHERE id = 'transcriber-permissions-other';
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Cross-workspace update allowed'; END IF;
      DELETE FROM public.transcribers WHERE id = 'transcriber-permissions-other';
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Cross-workspace delete allowed'; END IF;
      BEGIN
        INSERT INTO public.transcribers (id, name, description, organization_id, config)
        VALUES ('transcriber-permissions-forbidden', 'Forbidden', '', 'transcriber-permissions-other', '{}');
        RAISE EXCEPTION 'Cross-workspace insert allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END IF;
    IF member_role = 'workspace-admin' THEN
      BEGIN
        UPDATE public.transcribers SET organization_id = 'transcriber-permissions-other' WHERE id = 'transcriber-permissions-own';
        RAISE EXCEPTION 'Moving transcriber to unauthorized workspace allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END IF;
  END LOOP;

  FOREACH claims IN ARRAY ARRAY['{}', '{"organization_roles":[]}', '{"organization_roles":null}',
    '{"organization_roles":"user"}', '{"organization_roles":{}}',
    '{"organization_roles":[{"organization_id":"transcriber-permissions-own","role":"admin"}]}',
    '{"user_metadata":{"organization_roles":"admin"}}']::jsonb[] LOOP
    PERFORM set_config('request.jwt.claims', claims::text, true);
    IF public.authorize('user') OR public.authorize('user', 'transcriber-permissions-own')
      OR EXISTS (SELECT 1 FROM public.transcribers WHERE id LIKE 'transcriber-permissions-%') THEN
      RAISE EXCEPTION 'Invalid or untrusted claims granted access: %', claims;
    END IF;
  END LOOP;
END;
$test$;
RESET ROLE;
ROLLBACK;
