BEGIN;
INSERT INTO public.organizations(id,name,description) VALUES ('xrag-atomic-test','XRAG atomic test','');
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
DO $$
#variable_conflict use_variable
DECLARE id uuid := gen_random_uuid(); token uuid := gen_random_uuid(); plan jsonb; result jsonb; rejected boolean; old_token uuid;
BEGIN
  plan := jsonb_build_object('claims','admin','target',jsonb_build_object('workspaceId','xrag-atomic-test'),
    'entries','[{"kind":"documentRepository","localId":"xrag-atomic-repo","originId":"test/atomic-repo","name":"Imported","config":{"type":"database-v2","identifier":"test/atomic-repo"}}]'::jsonb,
    'files',jsonb_build_array(jsonb_build_object('path','xrag-atomic-test/xrag-atomic-repo/file.txt','basePath','xrag-atomic-test/xrag-atomic-repo/file.txt','stage',id || '/new/0','backup',id || '/old/0','remove',false)),
    'artifacts','[]'::jsonb,'processing','[{"id":"00000000-0000-4000-8000-000000000001","path":"file.txt","useSavedContent":false,"storage":{"type":"documentRepository","workspaceId":"xrag-atomic-test","documentRepositoryId":"xrag-atomic-repo"}}]'::jsonb);
  plan := public.begin_xrag_import(id,token,gen_random_uuid(),plan);
  IF EXISTS(SELECT 1 FROM public.databases WHERE databases.id='xrag-atomic-repo') THEN RAISE EXCEPTION 'Preparation published metadata'; END IF;
  IF (plan->'files'->0->>'hadOriginal')::boolean THEN RAISE EXCEPTION 'Incorrect undo plan'; END IF;
  rejected := false;
  BEGIN
    INSERT INTO storage.objects(bucket_id,name) VALUES('database_files','xrag-atomic-test/xrag-atomic-repo/file.txt');
  EXCEPTION WHEN raise_exception THEN rejected := SQLERRM='XRAG_IMPORT_IN_PROGRESS'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Reserved path writable without attempt credential'; END IF;
  -- Simulate Storage's internal finalization: only the signed JWT subject survives.
  INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('database_files','xrag-atomic-test/xrag-atomic-repo/file.txt',token::text);
  IF EXISTS(SELECT 1 FROM storage.objects WHERE name='xrag-atomic-test/xrag-atomic-repo/file.txt' AND owner_id IS NOT NULL) THEN RAISE EXCEPTION 'Transport credential leaked into ownership'; END IF;
  rejected := false;
  BEGIN
    UPDATE storage.objects SET name='xrag-atomic-test/xrag-atomic-repo/moved.txt' WHERE name='xrag-atomic-test/xrag-atomic-repo/file.txt';
  EXCEPTION WHEN raise_exception THEN rejected := SQLERRM='XRAG_IMPORT_IN_PROGRESS'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Rename escaped reservation'; END IF;
  old_token := token; token := gen_random_uuid();
  UPDATE public.xrag_import_transactions SET token=token WHERE xrag_import_transactions.id=id;
  rejected := false;
  BEGIN INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('xrag-import-staging',id || '/stale',old_token::text);
  EXCEPTION WHEN raise_exception THEN rejected:=SQLERRM='XRAG_IMPORT_LEASE_LOST'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Expired attempt survived recovery takeover'; END IF;
  UPDATE public.xrag_import_transactions SET state='applying',files_applied=true WHERE xrag_import_transactions.id=id;
  -- A failure after creating one metadata object must leave no metadata/outbox.
  UPDATE public.xrag_import_transactions SET plan=jsonb_set(plan,'{entries}',(plan->'entries') || '[{"kind":"invalid","localId":"fail","originId":"test/fail","config":{}}]'::jsonb) WHERE xrag_import_transactions.id=id;
  rejected := false;
  BEGIN PERFORM public.commit_xrag_import(id,token); EXCEPTION WHEN raise_exception THEN rejected:=true; END;
  IF NOT rejected OR EXISTS(SELECT 1 FROM public.databases WHERE databases.id='xrag-atomic-repo') OR EXISTS(SELECT 1 FROM public.scheduled_jobs WHERE scheduled_jobs.id='xrag:process:' || id) THEN RAISE EXCEPTION 'Failed commit published partial data'; END IF;
  UPDATE public.xrag_import_transactions t SET plan=jsonb_set(t.plan,'{entries}',jsonb_build_array(t.plan->'entries'->0)) WHERE t.id=id;
  result := public.commit_xrag_import(id,token);
  IF result->>'documentFileCount' <> '1' OR NOT EXISTS(SELECT 1 FROM public.databases WHERE databases.id='xrag-atomic-repo') THEN RAISE EXCEPTION 'Committed metadata missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.scheduled_jobs WHERE scheduled_jobs.id='xrag:process:' || id) THEN RAISE EXCEPTION 'Durable processing missing'; END IF;
  IF EXISTS(SELECT 1 FROM public.xrag_import_reservations WHERE import_id=id) THEN RAISE EXCEPTION 'Committed reservation retained'; END IF;
  IF public.commit_xrag_import(id,token) <> result THEN RAISE EXCEPTION 'Commit replay changed result'; END IF;
  rejected := false;
  BEGIN INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('xrag-import-staging',id || '/late',token::text);
  EXCEPTION WHEN raise_exception THEN rejected:=SQLERRM='XRAG_IMPORT_LEASE_LOST'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Abandoned request accepted after commit'; END IF;
  plan := jsonb_set(plan,'{entries}','[]'::jsonb);
  PERFORM public.begin_xrag_import(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),plan);
  rejected := false;
  BEGIN DELETE FROM public.databases WHERE databases.id='xrag-atomic-repo';
  EXCEPTION WHEN raise_exception THEN rejected:=SQLERRM='XRAG_IMPORT_IN_PROGRESS'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Repository deletion orphaned a reserved file'; END IF;
  rejected := false;
  BEGIN UPDATE public.databases SET organization_id='other' WHERE databases.id='xrag-atomic-repo';
  EXCEPTION WHEN raise_exception THEN rejected:=SQLERRM='XRAG_IMPORT_IN_PROGRESS'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Repository move orphaned a reserved file'; END IF;

END;
$$;
RESET ROLE;
DO $$ BEGIN
 IF has_table_privilege('authenticated','public.xrag_import_transactions','SELECT')
 OR has_table_privilege('authenticated','public.xrag_import_storage_tokens','SELECT')
 OR has_function_privilege('authenticated','public.commit_xrag_import(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Import internals exposed'; END IF;
END $$;
ROLLBACK;
