-- Run against a migrated local database with psql -v ON_ERROR_STOP=1.
-- Fixtures and attempted writes are always rolled back.
BEGIN;
INSERT INTO public.system_settings (key, value) VALUES
  ('welcomeMessage', '{"localized":{"en":"Public login regression test"}}'),
  ('signIn', '{"password":"visible","sso":"hidden"}'),
  ('theme', '{"version":"theme-v2","logo":{"de":{"url":"/api/storage/theme_logos/test/logo.png"}}}'),
  ('login-test-private', 'must remain private')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);
DO $test$
DECLARE
  affected integer;
BEGIN
  IF (SELECT count(*) FROM public.system_settings WHERE key IN ('welcomeMessage', 'signIn')) <> 2 THEN
    RAISE EXCEPTION 'Anonymous visitors cannot read the public login settings';
  END IF;
  IF (SELECT value::jsonb->'localized'->>'en' FROM public.system_settings WHERE key = 'welcomeMessage') IS DISTINCT FROM 'Public login regression test' THEN
    RAISE EXCEPTION 'Anonymous visitors cannot read the configured login text';
  END IF;
  IF (SELECT value::jsonb->'logo'->'de'->>'url' FROM public.system_settings WHERE key = 'theme') IS DISTINCT FROM '/api/storage/theme_logos/test/logo.png' THEN
    RAISE EXCEPTION 'Anonymous theme readers cannot load the configured sidebar logo';
  END IF;
  IF EXISTS (SELECT 1 FROM public.system_settings WHERE key NOT IN ('welcomeMessage', 'signIn', 'theme')) THEN
    RAISE EXCEPTION 'Non-public settings leaked to anonymous visitors';
  END IF;
  UPDATE public.system_settings SET value = 'tampered' WHERE key = 'welcomeMessage';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Anonymous update allowed'; END IF;
  DELETE FROM public.system_settings WHERE key = 'signIn';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Anonymous delete allowed'; END IF;
  UPDATE public.system_settings SET value = 'tampered' WHERE key = 'theme';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Anonymous theme update allowed'; END IF;
  DELETE FROM public.system_settings WHERE key = 'theme';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Anonymous theme delete allowed'; END IF;
  BEGIN
    INSERT INTO public.system_settings (key, value) VALUES ('login-test-insert', 'forbidden');
    RAISE EXCEPTION 'Anonymous insert allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
RESET ROLE;
ROLLBACK;
