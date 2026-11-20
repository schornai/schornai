BEGIN;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name) VALUES ('xrag-transfers','11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/object.xrag.tar');
DO $$
DECLARE affected bigint;
BEGIN
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id='xrag-transfers') <> 1 THEN RAISE EXCEPTION 'Owner cannot read own transfer'; END IF;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES ('xrag-transfers','33333333-3333-4333-8333-333333333333/22222222-2222-4222-8222-222222222222/object.xrag.tar');
    RAISE EXCEPTION 'Other owner accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE storage.objects SET metadata='{}' WHERE bucket_id='xrag-transfers';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Transfer is mutable'; END IF;
  -- Storage's own deletion guard runs before RLS; emulate the Storage API
  -- session so this assertion specifically tests our missing DELETE policy.
  PERFORM set_config('storage.allow_delete_query', 'true', true);
  DELETE FROM storage.objects WHERE bucket_id='xrag-transfers';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Client removed an immutable transfer'; END IF;
END;
$$;
SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='xrag-transfers') THEN RAISE EXCEPTION 'Other administrator can read transfer'; END IF;
END; $$;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","organization_roles":[{"organization_id":"workspace","role":"editor"}]}';
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='xrag-transfers') THEN RAISE EXCEPTION 'Editor can read transfer'; END IF;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES ('xrag-transfers','11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/other.xrag.tar');
    RAISE EXCEPTION 'Editor can upload transfer';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END; $$;
ROLLBACK;
