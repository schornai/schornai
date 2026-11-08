BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE
  first_owner uuid := gen_random_uuid(); second_owner uuid := gen_random_uuid();
  job public.artifact_publications; duplicate public.artifact_publications;
  digest text := repeat('a',64); metadata jsonb; result text;
BEGIN
  INSERT INTO public.artifact_publications(upload_path,name) VALUES ('uploads/test/one.tar','one.tar');
  SELECT * INTO job FROM public.claim_artifact_publication(first_owner);
  IF job.state <> 'processing' OR job.attempts <> 1 THEN RAISE EXCEPTION 'Not claimed'; END IF;
  IF EXISTS(SELECT 1 FROM public.claim_artifact_publication(second_owner)) THEN RAISE EXCEPTION 'Duplicate owner'; END IF;
  IF public.renew_artifact_publication(job.id,second_owner) THEN RAISE EXCEPTION 'Foreign renewal'; END IF;
  UPDATE public.artifact_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=job.id;
  IF public.renew_artifact_publication(job.id,first_owner) THEN RAISE EXCEPTION 'Expired renewal'; END IF;
  SELECT * INTO job FROM public.claim_artifact_publication(second_owner);
  IF job.attempts <> 2 THEN RAISE EXCEPTION 'Crash not reclaimed'; END IF;
  metadata := jsonb_build_object('id',digest,'name','one.tar','size',42,'createdAt',clock_timestamp(),'xrag',jsonb_build_object('xrag_type','files','xrag_version',1));
  BEGIN
    PERFORM public.finish_artifact_publication(job.id,first_owner,metadata);
    RAISE EXCEPTION 'Stale owner published';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'ARTIFACT_LEASE_LOST' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.finish_artifact_publication(job.id,null,metadata);
    RAISE EXCEPTION 'Missing owner published';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'ARTIFACT_LEASE_LOST' THEN RAISE; END IF;
  END;
  result := public.finish_artifact_publication(job.id,second_owner,metadata);
  IF result <> digest OR NOT EXISTS(SELECT 1 FROM public.artifact_publications WHERE id=job.id AND state='published') THEN RAISE EXCEPTION 'Publication incomplete'; END IF;
  INSERT INTO public.artifact_publications(upload_path,name) VALUES ('uploads/test/duplicate.tar','duplicate.tar');
  SELECT * INTO duplicate FROM public.claim_artifact_publication(first_owner);
  result := public.finish_artifact_publication(duplicate.id,first_owner,metadata);
  IF (SELECT object_path FROM public.artifact_catalog WHERE id=digest) <> job.upload_path THEN RAISE EXCEPTION 'Duplicate replaced bytes'; END IF;
  UPDATE public.artifact_catalog SET deleted_at=clock_timestamp() WHERE id=digest;
  INSERT INTO public.artifact_publications(upload_path,name) VALUES ('uploads/test/withdrawn.tar','withdrawn.tar');
  SELECT * INTO duplicate FROM public.claim_artifact_publication(first_owner);
  result := public.finish_artifact_publication(duplicate.id,first_owner,metadata);
  IF result IS NOT NULL OR (SELECT state FROM public.artifact_publications WHERE id=duplicate.id) <> 'error' THEN RAISE EXCEPTION 'Withdrawal resurrected'; END IF;
  INSERT INTO public.artifact_publications(upload_path,name,attempts) VALUES ('uploads/test/crashed.tar','crashed.tar',5);
  PERFORM public.claim_artifact_publication(first_owner);
  IF (SELECT state FROM public.artifact_publications WHERE upload_path='uploads/test/crashed.tar') <> 'error' THEN RAISE EXCEPTION 'Unbounded retry'; END IF;
END $$;
-- Unpublished old objects are claimed for API cleanup, while active uploads
-- and adopted artifacts stay protected. No SQL operation deletes Storage rows.
INSERT INTO storage.objects(bucket_id,name,created_at,updated_at) VALUES
 ('box-action-files','uploads/expired/archive.tar',now()-interval '4 days',now()-interval '4 days'),
 ('box-action-files','uploads/fresh/archive.tar',now(),now()),
 ('box-action-files','uploads/queued/archive.tar',now()-interval '4 days',now()-interval '4 days');
INSERT INTO public.artifact_publications(upload_path,name) VALUES ('uploads/queued/archive.tar','archive.tar');
DO $$
BEGIN
 IF public.expire_artifact_uploads() <> 1 THEN RAISE EXCEPTION 'Wrong orphan cleanup selection'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.artifact_publications WHERE upload_path='uploads/expired/archive.tar' AND state='error') THEN RAISE EXCEPTION 'Orphan not claimed'; END IF;
 IF EXISTS(SELECT 1 FROM public.artifact_publications WHERE upload_path='uploads/fresh/archive.tar') THEN RAISE EXCEPTION 'Fresh upload expired'; END IF;
 IF (SELECT state FROM public.artifact_publications WHERE upload_path='uploads/queued/archive.tar') <> 'queued' THEN RAISE EXCEPTION 'Active job expired'; END IF;
 IF public.expire_artifact_uploads() <> 0 THEN RAISE EXCEPTION 'Cleanup not idempotent'; END IF;
 UPDATE public.artifact_publications SET cleaned_at=clock_timestamp() WHERE upload_path='uploads/expired/archive.tar';
 IF public.expire_artifact_uploads() <> 1 THEN RAISE EXCEPTION 'Recreated terminal object not reclaimed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='box-action-files' AND name='uploads/expired/archive.tar') THEN RAISE EXCEPTION 'Storage bytes bypassed API'; END IF;
END $$;
RESET ROLE;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_table_privilege(role_name,'public.artifact_catalog','INSERT') OR has_table_privilege(role_name,'public.artifact_publications','SELECT')
      OR has_function_privilege(role_name,'public.finish_artifact_publication(uuid,uuid,jsonb)','EXECUTE')
      OR has_function_privilege(role_name,'public.claim_artifact_publication(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Public artifact ledger access'; END IF;
  END LOOP;
END $$;
ROLLBACK;
