BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE job uuid := gen_random_uuid(); token uuid := gen_random_uuid(); owner_id uuid := gen_random_uuid();
  upload_id uuid := gen_random_uuid(); source_path text := owner_id || '/' || upload_id || '/collection.tar';
  plan jsonb := jsonb_build_object('source', jsonb_build_object('path',source_path,'uploadId',upload_id),
    'entries','[]'::jsonb,'files','[]'::jsonb,'processing','[]'::jsonb,'artifacts','[]'::jsonb);
BEGIN
  INSERT INTO public.xrag_prepared_uploads(id,user_id,source_path,name,size,digest,prefix,entries)
    VALUES(upload_id,owner_id,source_path,'collection.tar',1,repeat('a',64),'child','[]');
  PERFORM public.reserve_xrag_import(job,token,owner_id,plan);
  BEGIN
    PERFORM public.reserve_xrag_import(gen_random_uuid(),gen_random_uuid(),owner_id,plan);
    RAISE EXCEPTION 'duplicate import was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  UPDATE public.xrag_prepared_uploads SET created_at = now() - interval '2 hours' WHERE id = upload_id;
  IF EXISTS(SELECT FROM public.expired_xrag_prepared_uploads() p WHERE p.source_path = plan->'source'->>'path')
    OR public.removable_xrag_objects('xrag-prepared',ARRAY['child/file'],source_path) IS NOT NULL
    THEN RAISE EXCEPTION 'expired selection lost an active reservation'; END IF;
  PERFORM public.set_xrag_import_plan(job,token,plan);
  UPDATE public.xrag_import_transactions SET expires_at = now() - interval '1 second' WHERE id = job;
  BEGIN
    PERFORM public.set_xrag_import_plan(job,token,plan);
    RAISE EXCEPTION 'expired lease modified the plan';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'XRAG_IMPORT_LEASE_LOST' THEN RAISE; END IF; END;
  UPDATE public.xrag_import_transactions SET state = 'rolling_back',token = gen_random_uuid(),expires_at = now() + interval '5 minutes' WHERE id = job;
  BEGIN
    PERFORM public.set_xrag_import_plan(job,token,plan);
    RAISE EXCEPTION 'a superseded importer modified the plan';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'XRAG_IMPORT_LEASE_LOST' THEN RAISE; END IF; END;
  BEGIN
    PERFORM public.reserve_xrag_import(gen_random_uuid(),gen_random_uuid(),owner_id,plan);
    RAISE EXCEPTION 'an expired selection was reserved';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'XRAG_TRANSFER_EXPIRED' THEN RAISE; END IF; END;
  -- Explicit discard can also win before expiry. The archive is already irrevocably
  -- assigned to cleanup once Storage receives its first list of removable paths.
  upload_id := gen_random_uuid(); source_path := owner_id || '/' || upload_id || '/another.tar';
  plan := jsonb_set(plan,'{source}',jsonb_build_object('path',source_path,'uploadId',upload_id));
  INSERT INTO public.xrag_prepared_uploads(id,user_id,source_path,name,size,digest,prefix,entries)
    VALUES(upload_id,owner_id,source_path,'another.tar',1,repeat('b',64),'other','[]');
  IF public.removable_xrag_objects('xrag-prepared',ARRAY['other/file'],source_path) IS DISTINCT FROM ARRAY['other/file'] THEN
    RAISE EXCEPTION 'discard failed to claim its selection'; END IF;
  BEGIN
    PERFORM public.reserve_xrag_import(gen_random_uuid(),gen_random_uuid(),owner_id,plan);
    RAISE EXCEPTION 'a selection already being discarded was reserved';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'XRAG_TRANSFER_EXPIRED' THEN RAISE; END IF; END;
  IF has_function_privilege('authenticated','public.reserve_xrag_import(uuid,uuid,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('anon','public.set_xrag_import_plan(uuid,uuid,jsonb)','EXECUTE')
    THEN RAISE EXCEPTION 'private import functions exposed'; END IF;
END $$;
ROLLBACK;
