-- Run against a migrated disposable database; everything rolls back.
BEGIN;
DO $test$
BEGIN
  IF has_table_privilege('anon', 'public.mcp_oauth_sessions', 'SELECT')
     OR has_table_privilege('authenticated', 'public.mcp_oauth_sessions', 'SELECT')
     OR has_table_privilege('authenticated', 'public.mcp_oauth_sessions', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.mcp_oauth_sessions', 'INSERT')
     OR has_table_privilege('authenticated', 'public.mcp_oauth_sessions', 'DELETE') THEN
    RAISE EXCEPTION 'MCP credentials are exposed';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.mcp_oauth_sessions'::regclass) THEN
    RAISE EXCEPTION 'MCP credential RLS is disabled';
  END IF;
END $test$;
INSERT INTO auth.users (id) VALUES ('a1b00000-0000-4000-8000-000000000091'), ('a1b00000-0000-4000-8000-000000000092');
SET LOCAL ROLE service_role;
INSERT INTO public.mcp_oauth_sessions (user_id, server_url, data, version, state, state_expires_at) VALUES
('a1b00000-0000-4000-8000-000000000091', 'https://mcp.test/v1', '{"tokens":{"access_token":"alice"}}', gen_random_uuid(), 'alice-state', now() + interval '10 minutes'),
('a1b00000-0000-4000-8000-000000000092', 'https://mcp.test/v1', '{"tokens":{"access_token":"bob"}}', gen_random_uuid(), 'bob-state', now() - interval '1 minute');
DO $test$
DECLARE affected integer; old_version uuid;
BEGIN
  UPDATE public.mcp_oauth_sessions SET state = NULL
    WHERE user_id = 'a1b00000-0000-4000-8000-000000000092' AND state = 'alice-state' AND state_expires_at > now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Cross-user callback accepted'; END IF;
  UPDATE public.mcp_oauth_sessions SET state = NULL
    WHERE user_id = 'a1b00000-0000-4000-8000-000000000092' AND state = 'bob-state' AND state_expires_at > now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Expired callback accepted'; END IF;
  UPDATE public.mcp_oauth_sessions SET state = NULL, version = gen_random_uuid()
    WHERE user_id = 'a1b00000-0000-4000-8000-000000000091' AND state = 'alice-state' AND state_expires_at > now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Valid callback rejected'; END IF;
  UPDATE public.mcp_oauth_sessions SET state = NULL
    WHERE user_id = 'a1b00000-0000-4000-8000-000000000091' AND state = 'alice-state' AND state_expires_at > now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Replayed callback accepted'; END IF;
  SELECT version INTO old_version FROM public.mcp_oauth_sessions WHERE user_id = 'a1b00000-0000-4000-8000-000000000091';
  UPDATE public.mcp_oauth_sessions SET version = gen_random_uuid() WHERE user_id = 'a1b00000-0000-4000-8000-000000000091' AND version = old_version;
  UPDATE public.mcp_oauth_sessions SET data = '{}' WHERE user_id = 'a1b00000-0000-4000-8000-000000000091' AND version = old_version;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Stale credentials overwrote new generation'; END IF;
END $test$;
ROLLBACK;
