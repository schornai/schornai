BEGIN;
INSERT INTO auth.users(id) VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222') ON CONFLICT DO NOTHING;
INSERT INTO public.xrag_export_jobs(id,user_id,name,selections,claims) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','package.xrag.tar','[{"kind":"model","id":"model"}]','"admin"');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
DO $$ BEGIN
  IF (SELECT count(id) FROM public.xrag_export_jobs WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>1 THEN RAISE EXCEPTION 'owner cannot read'; END IF;
  BEGIN PERFORM selections FROM public.xrag_export_jobs; RAISE EXCEPTION 'private payload exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.claim_xrag_export(gen_random_uuid()); RAISE EXCEPTION 'client can claim'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
DO $$ BEGIN
  IF EXISTS(SELECT id FROM public.xrag_export_jobs WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN RAISE EXCEPTION 'cross-owner leak'; END IF;
END $$;
RESET ROLE;
-- Isolate this transaction's test work from any local queued jobs.
UPDATE public.xrag_export_jobs SET retry_at=clock_timestamp()+interval '1 day' WHERE id<>'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND state='queued';
SELECT * FROM public.claim_xrag_export('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
DO $$ BEGIN
  IF (SELECT state FROM public.xrag_export_jobs WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')<>'processing' THEN RAISE EXCEPTION 'not claimed'; END IF;
  IF public.update_xrag_export('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc') THEN RAISE EXCEPTION 'stale owner renewed'; END IF;
END $$;
UPDATE public.xrag_export_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT * FROM public.claim_xrag_export('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
DO $$ BEGIN
  IF public.update_xrag_export('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','finished',100,100,'11111111-1111-4111-8111-111111111111/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/test.tar') THEN RAISE EXCEPTION 'stale owner published'; END IF;
  IF NOT public.update_xrag_export('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc','finished',128849018880,128849018880,'11111111-1111-4111-8111-111111111111/cccccccc-cccc-4ccc-8ccc-cccccccccccc/test.tar') THEN RAISE EXCEPTION 'current owner could not finish >100 GiB'; END IF;
END $$;
ROLLBACK;
