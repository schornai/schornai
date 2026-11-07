-- All checks roll back; no existing credentials are read or changed.
BEGIN;
DO $test$
BEGIN
  IF has_table_privilege('anon', 'public.provider_connections', 'SELECT')
     OR has_table_privilege('authenticated', 'public.provider_connections', 'SELECT')
     OR has_table_privilege('authenticated', 'public.provider_connections', 'INSERT')
     OR has_table_privilege('authenticated', 'public.provider_connections', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.provider_connections', 'DELETE') THEN
    RAISE EXCEPTION 'Provider credentials exposed to browser roles';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.provider_connections'::regclass) THEN
    RAISE EXCEPTION 'Provider credential RLS disabled';
  END IF;
END $test$;
SET LOCAL ROLE service_role;
INSERT INTO public.provider_connections (name, kind, secret) VALUES ('Test search', 'brave', 'test-only');
INSERT INTO public.provider_connections (name, kind, client_id) VALUES ('Reusable OAuth', 'oauth', 'test-client');
INSERT INTO public.provider_connections (name, kind, client_id, issuer)
VALUES ('Bound OAuth', 'oauth', 'test-client', 'https://auth.example.test');
DO $test$
BEGIN
  BEGIN
    INSERT INTO public.provider_connections (name, kind, secret, issuer) VALUES ('Invalid search issuer', 'brave', 'test-only', 'https://auth.example.test');
    RAISE EXCEPTION 'Search issuer accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.provider_connections (name, kind, client_id, issuer) VALUES ('Blank issuer', 'oauth', 'test-client', ' ');
    RAISE EXCEPTION 'Blank issuer accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.provider_connections (name, kind) VALUES ('Invalid search', 'staan');
    RAISE EXCEPTION 'Search without credentials accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.provider_connections (name, kind) VALUES ('Invalid OAuth', 'oauth');
    RAISE EXCEPTION 'OAuth without client accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $test$;
ROLLBACK;
