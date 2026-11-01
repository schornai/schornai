-- Run against a migrated database. All fixtures are rolled back.
BEGIN;
-- Storage API requests set this flag; fixtures never leave this transaction.
SET LOCAL storage.allow_delete_query = 'true';
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('theme_logos', 'theme-logo-policy-test/logo.svg'),
  ('model_images', 'theme-logo-policy-test/private.png');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);
SELECT set_config('storage.operation', 'object.get_authenticated', true);
DO $test$
BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE name LIKE 'theme-logo-policy-test/%') <> 1 THEN
    RAISE EXCEPTION 'Anonymous downloads must expose only the theme logo';
  END IF;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('theme_logos', 'theme-logo-policy-test/anonymous.svg');
    RAISE EXCEPTION 'Anonymous uploads must be forbidden';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$test$;
SELECT set_config('storage.operation', 'object.list', true);
DO $test$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'theme_logos') THEN
    RAISE EXCEPTION 'Anonymous bucket listing must be forbidden';
  END IF;
END;
$test$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $test$
DECLARE
  member_role text;
  affected integer;
BEGIN
  FOREACH member_role IN ARRAY ARRAY['user', 'editor', 'workspace-admin'] LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('organization_roles', jsonb_build_array(jsonb_build_object('organization_id', 'test', 'role', member_role)))::text, true);
    PERFORM set_config('storage.operation', 'object.get_authenticated', true);
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'theme_logos' AND name = 'theme-logo-policy-test/logo.svg') THEN
      RAISE EXCEPTION '% cannot view a theme logo', member_role;
    END IF;
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('theme_logos', 'theme-logo-policy-test/forbidden.svg');
      RAISE EXCEPTION '% must not upload logos', member_role;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    UPDATE storage.objects SET name = 'theme-logo-policy-test/forbidden.svg' WHERE bucket_id = 'theme_logos' AND name = 'theme-logo-policy-test/logo.svg';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% must not replace logos', member_role; END IF;
    DELETE FROM storage.objects WHERE bucket_id = 'theme_logos' AND name LIKE 'theme-logo-policy-test/%';
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% must not remove logos', member_role; END IF;
  END LOOP;
  PERFORM set_config('request.jwt.claims', '{"organization_roles":"admin"}', true);
  INSERT INTO storage.objects (bucket_id, name) VALUES ('theme_logos', 'theme-logo-policy-test/admin.svg');
  UPDATE storage.objects SET name = 'theme-logo-policy-test/updated.svg' WHERE bucket_id = 'theme_logos' AND name = 'theme-logo-policy-test/admin.svg';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin must be able to replace logos'; END IF;
  DELETE FROM storage.objects WHERE bucket_id = 'theme_logos' AND name = 'theme-logo-policy-test/updated.svg';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin must be able to remove logos'; END IF;
END;
$test$;
RESET ROLE;
ROLLBACK;
