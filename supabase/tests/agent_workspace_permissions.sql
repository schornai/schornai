-- Run with psql -v ON_ERROR_STOP=1 against a migrated local Supabase database.
-- All fixtures and changes are rolled back, including on a failed assertion.
BEGIN;

INSERT INTO public.organizations (id, name, description)
VALUES ('agent-permissions-own', 'Permission test', ''),
       ('agent-permissions-other', 'Other workspace', '');
UPDATE public.organizations SET auto_join = true WHERE id = 'agent-permissions-own';
INSERT INTO public.chatbots (id, name, description, organization_id, config, roles)
VALUES ('agent-permissions-own', 'Own agent', '', 'agent-permissions-own', '{}', '[]'),
       ('agent-permissions-other', 'Other agent', '', 'agent-permissions-other', '{}', '[]');

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
      jsonb_build_array(jsonb_build_object('organization_id', 'agent-permissions-own', 'role', member_role)) END;
    PERFORM set_config('request.jwt.claims', jsonb_build_object('organization_roles', claims)::text, true);

    FOREACH required_role IN ARRAY ARRAY['user', 'editor', 'workspace-admin', 'admin']::public.user_role[] LOOP
      expected := member_role = 'admin'
        OR required_role = 'user'
        OR (required_role = 'editor' AND member_role IN ('editor', 'workspace-admin'))
        OR (required_role = 'workspace-admin' AND member_role = 'workspace-admin');
      IF public.authorize(required_role, 'agent-permissions-own') IS DISTINCT FROM expected
        OR public.authorize(required_role) IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Incorrect permission % for %', required_role, member_role;
      END IF;
      IF public.authorize(required_role, 'agent-permissions-other') IS DISTINCT FROM (member_role = 'admin') THEN
        RAISE EXCEPTION 'Incorrect cross-workspace permission % for %', required_role, member_role;
      END IF;
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM public.chatbots WHERE id = 'agent-permissions-own') THEN
      RAISE EXCEPTION '% cannot read its agent for chatting', member_role;
    END IF;
    -- No user_roles rows exist for these fixtures: Auto-Join and SAML grant
    -- membership through the JWT. The UI needs both the agent and its workspace.
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = 'agent-permissions-own') THEN
      RAISE EXCEPTION '% can read its agent but not its workspace', member_role;
    END IF;
    IF EXISTS (SELECT 1 FROM public.organizations WHERE id = 'agent-permissions-other') <> (member_role = 'admin') THEN
      RAISE EXCEPTION 'Incorrect cross-workspace visibility for %', member_role;
    END IF;
    IF EXISTS (SELECT 1 FROM public.chatbots WHERE id = 'agent-permissions-other') <> (member_role = 'admin') THEN
      RAISE EXCEPTION 'Incorrect cross-workspace agent visibility for %', member_role;
    END IF;

    UPDATE public.chatbots SET name = 'Updated' WHERE id = 'agent-permissions-own';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> (CASE WHEN member_role IN ('workspace-admin', 'admin') THEN 1 ELSE 0 END) THEN
      RAISE EXCEPTION 'Incorrect update permission for %', member_role;
    END IF;

    BEGIN
      INSERT INTO public.chatbots (id, name, description, organization_id, config, roles)
      VALUES ('agent-permissions-created', 'Created', '', 'agent-permissions-own', '{}', '[]');
      IF member_role NOT IN ('workspace-admin', 'admin') THEN
        RAISE EXCEPTION '% must not create agents', member_role;
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      IF member_role IN ('workspace-admin', 'admin') THEN RAISE; END IF;
    END;

    DELETE FROM public.chatbots WHERE id = 'agent-permissions-own';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> (CASE WHEN member_role IN ('workspace-admin', 'admin') THEN 1 ELSE 0 END) THEN
      RAISE EXCEPTION 'Incorrect delete permission for %', member_role;
    END IF;
    IF affected = 1 THEN
      INSERT INTO public.chatbots (id, name, description, organization_id, config, roles)
      VALUES ('agent-permissions-own', 'Own agent', '', 'agent-permissions-own', '{}', '[]');
      DELETE FROM public.chatbots WHERE id = 'agent-permissions-created';
    END IF;

    IF member_role <> 'admin' THEN
      UPDATE public.organizations SET auto_join = false WHERE id = 'agent-permissions-own';
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Workspace membership allowed changing auto-join'; END IF;
      DELETE FROM public.organizations WHERE id = 'agent-permissions-own';
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Workspace membership allowed deleting workspace'; END IF;
      UPDATE public.chatbots SET name = 'Forbidden' WHERE id = 'agent-permissions-other';
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Cross-workspace update allowed'; END IF;
      DELETE FROM public.chatbots WHERE id = 'agent-permissions-other';
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected <> 0 THEN RAISE EXCEPTION 'Cross-workspace delete allowed'; END IF;
      BEGIN
        INSERT INTO public.chatbots (id, name, description, organization_id, config, roles)
        VALUES ('agent-permissions-forbidden', 'Forbidden', '', 'agent-permissions-other', '{}', '[]');
        RAISE EXCEPTION 'Cross-workspace insert allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END IF;
    IF member_role = 'workspace-admin' THEN
      BEGIN
        UPDATE public.chatbots SET organization_id = 'agent-permissions-other' WHERE id = 'agent-permissions-own';
        RAISE EXCEPTION 'Moving agent to unauthorized workspace allowed';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END IF;
  END LOOP;

  FOREACH claims IN ARRAY ARRAY['{}', '{"organization_roles":[]}', '{"organization_roles":null}',
    '{"organization_roles":"user"}', '{"organization_roles":{}}',
    '{"organization_roles":[{"organization_id":"agent-permissions-own","role":"admin"}]}',
    '{"user_metadata":{"organization_roles":"admin"}}']::jsonb[] LOOP
    PERFORM set_config('request.jwt.claims', claims::text, true);
    IF public.authorize('user') OR public.authorize('user', 'agent-permissions-own')
      OR EXISTS (SELECT 1 FROM public.chatbots WHERE id LIKE 'agent-permissions-%')
      OR EXISTS (SELECT 1 FROM public.organizations WHERE id LIKE 'agent-permissions-%') THEN
      RAISE EXCEPTION 'Invalid or untrusted claims granted access: %', claims;
    END IF;
  END LOOP;
END;
$test$;
RESET ROLE;
ROLLBACK;
