BEGIN;
INSERT INTO public.xrag_prepared_uploads(id,user_id,source_path,name,size,digest,prefix,entries,created_at)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','test/source.tar','source.tar',128849018880,repeat('a',64),'test-prefix','[]',now()-interval '61 minutes');
INSERT INTO storage.objects(bucket_id,name,updated_at) VALUES
('xrag-prepared','test-prefix/child.tar',now()-interval '61 minutes'),
('xrag-prepared','orphan/child.tar',now()-interval '73 hours'),
('xrag-transfers','test/source.tar',now()-interval '61 minutes');
-- The child may be much older than its still-valid inventory.
UPDATE storage.objects SET updated_at=now()-interval '73 hours' WHERE name='test-prefix/child.tar';
UPDATE public.xrag_prepared_uploads SET created_at=now() WHERE source_path='test/source.tar';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.expired_xrag_prepared_objects() WHERE name='test-prefix/child.tar')
 OR EXISTS(SELECT 1 FROM public.expired_xrag_prepared_uploads() WHERE source_path='test/source.tar')
 THEN RAISE EXCEPTION 'fresh selection lost its child'; END IF;
END $$;
UPDATE public.xrag_prepared_uploads SET created_at=now()-interval '61 minutes' WHERE source_path='test/source.tar';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
DO $$ BEGIN
 IF (SELECT count(*) FROM public.xrag_prepared_uploads WHERE source_path='test/source.tar')<>1 THEN RAISE EXCEPTION 'owner cannot read ready upload'; END IF;
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='xrag-prepared') THEN RAISE EXCEPTION 'private payload exposed'; END IF;
 BEGIN UPDATE public.xrag_prepared_uploads SET entries='[]'; RAISE EXCEPTION 'client can forge inventory'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.expired_xrag_prepared_uploads(); RAISE EXCEPTION 'client can enumerate cleanup'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.xrag_prepared_uploads WHERE source_path='test/source.tar') THEN RAISE EXCEPTION 'cross-owner inventory leak'; END IF;
END $$;
RESET ROLE;
INSERT INTO public.xrag_import_transactions(id,user_id,token,plan)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111',gen_random_uuid(),'{"source":{"path":"test/source.tar"}}');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.expired_xrag_prepared_uploads() WHERE source_path='test/source.tar') THEN RAISE EXCEPTION 'active selection expires'; END IF;
 IF EXISTS(SELECT 1 FROM public.expired_xrag_prepared_objects() WHERE name='test-prefix/child.tar') THEN RAISE EXCEPTION 'active child expires'; END IF;
 IF EXISTS(SELECT 1 FROM public.expired_xrag_transfers() WHERE name='test/source.tar') THEN RAISE EXCEPTION 'active original expires'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.expired_xrag_prepared_objects() WHERE name='orphan/child.tar') THEN RAISE EXCEPTION 'abandoned preparation never expires'; END IF;
END $$;
UPDATE public.xrag_import_transactions SET state='committed' WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.expired_xrag_prepared_uploads() WHERE source_path='test/source.tar') THEN RAISE EXCEPTION 'completed selection never expires'; END IF;
 -- Deleting the expired inventory through the worker removes its children.
END $$;
ROLLBACK;
