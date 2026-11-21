BEGIN;
SET LOCAL ROLE service_role;
SET LOCAL storage.allow_delete_query = 'true';
DO $$
DECLARE
  owner_id uuid := '11111111-1111-4111-8111-111111111111';
  upload_id uuid := '22222222-2222-4222-8222-222222222222';
  original text := owner_id || '/' || upload_id || '/setup.tar';
  ref text := 'imported/xrag-transfers/' || original;
  import_id uuid := gen_random_uuid();
  token uuid := gen_random_uuid();
  obj uuid;
  plan jsonb := jsonb_build_object('source',jsonb_build_object('uploadId',upload_id,'path',original),
    'entries','[]'::jsonb,'files','[]'::jsonb,'processing','[]'::jsonb,
    'artifacts',jsonb_build_array(jsonb_build_object('path',ref,'name','setup.tar')));
  publication uuid;
BEGIN
  INSERT INTO storage.objects(bucket_id,name,updated_at,metadata)
    VALUES ('xrag-transfers',original,now()-interval '4 days','{"size":214748364800}') RETURNING id INTO obj;
  PERFORM public.begin_xrag_import(import_id,token,owner_id,plan);
  IF public.removable_xrag_objects('xrag-transfers',ARRAY[original],original) IS NOT NULL
    THEN RAISE EXCEPTION 'active import could lose its original during cleanup'; END IF;
  BEGIN
    PERFORM public.begin_xrag_import(gen_random_uuid(),gen_random_uuid(),owner_id,plan);
    RAISE EXCEPTION 'duplicate begin succeeded';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  UPDATE public.xrag_import_transactions SET state='applying' WHERE id=import_id;
  publication := (public.commit_xrag_import(import_id,token)->'publications'->>0)::uuid;
  IF (SELECT retained_object_id FROM public.artifact_publications WHERE id=publication) IS DISTINCT FROM obj
    OR public.removable_xrag_objects('xrag-transfers', ARRAY[original,'other'],original) <> ARRAY['other']
    OR EXISTS(SELECT 1 FROM public.expired_xrag_transfers() WHERE name=original)
    THEN RAISE EXCEPTION 'queued original was not protected'; END IF;
  BEGIN
    DELETE FROM storage.objects WHERE id=obj;
    RAISE EXCEPTION 'pending original removed';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  UPDATE public.artifact_publications SET state='processing',lease_until=now()+interval '5 minutes',owner_token=token WHERE id=publication;
  PERFORM public.finish_artifact_publication(publication,token,jsonb_build_object('id',repeat('f',64),'size',214748364800,'xrag','{"xrag_type":"setup"}'::jsonb));
  IF NOT EXISTS(SELECT 1 FROM public.artifact_catalog WHERE object_path=ref)
    OR public.removable_xrag_objects('xrag-transfers',ARRAY[original],original) <> ARRAY[]::text[]
    THEN RAISE EXCEPTION 'published original unavailable'; END IF;
  INSERT INTO storage.objects(bucket_id,name,updated_at) VALUES('xrag-prepared','child.tar',now()-interval '4 days');
  INSERT INTO public.artifact_publications(upload_path,name) VALUES('imported/xrag-prepared/child.tar','child.tar');
  IF EXISTS(SELECT 1 FROM public.expired_xrag_prepared_objects() WHERE name='child.tar')
    THEN RAISE EXCEPTION 'retained child selected by orphan cleanup'; END IF;
  UPDATE public.artifact_publications SET retained_object_id=NULL WHERE upload_path='imported/xrag-prepared/child.tar';
  IF NOT EXISTS(SELECT 1 FROM public.expired_xrag_prepared_objects() WHERE name='child.tar')
    THEN RAISE EXCEPTION 'released child still retained'; END IF;
END $$;
INSERT INTO public.scheduled_jobs(id,kind,payload) VALUES (
 'xrag:prepare:11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','xrag.import.prepare','{}');
INSERT INTO public.xrag_import_transactions(user_id,id,token,state,plan)
SELECT '11111111-1111-4111-8111-111111111111',gen_random_uuid(),gen_random_uuid(),'rolled_back',
  '{"source":{"path":"11111111-1111-4111-8111-111111111111/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/build14.tar"}}'::jsonb FROM generate_series(1,2);
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
DO $$ BEGIN
  IF public.get_xrag_import_status('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') IS DISTINCT FROM 'rolled_back'
    OR public.get_xrag_import_status('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') IS DISTINCT FROM 'inspecting'
    OR public.get_xrag_import_status('22222222-2222-4222-8222-222222222222') IS DISTINCT FROM 'committed'
    OR EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='xrag-transfers' AND name LIKE '%/setup.tar')
    THEN RAISE EXCEPTION 'owner cannot see terminal status or can still list the consumed upload'; END IF;
END $$;
SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-4333-8333-333333333333","organization_roles":[{"organization_id":"workspace","role":"workspace-admin"}]}';
DO $$ BEGIN
  IF public.get_xrag_import_status('22222222-2222-4222-8222-222222222222') IS NOT NULL
    OR has_function_privilege('authenticated','public.removable_xrag_objects(text,text[],text)','EXECUTE')
    THEN RAISE EXCEPTION 'another user has access to private import state'; END IF;
END $$;
ROLLBACK;
