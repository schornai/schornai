-- Run with psql -v ON_ERROR_STOP=1 against a migrated local Supabase database.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE a public.task_claims; b public.task_claims;
  first_owner uuid := gen_random_uuid(); second_owner uuid := gen_random_uuid();
BEGIN
  SELECT * INTO a FROM public.claim_background_task('claim-test',first_owner,'first-snapshot');
  SELECT * INTO b FROM public.claim_background_task('claim-test',second_owner,'second-snapshot');
  IF a.owner_token <> first_owner OR b.owner_token <> first_owner OR b.snapshot <> 'first-snapshot' THEN RAISE EXCEPTION 'Duplicate owner accepted'; END IF;
  IF public.renew_background_task('claim-test',second_owner) OR public.finish_background_task('claim-test',second_owner,'finished','forged-result') THEN RAISE EXCEPTION 'Foreign owner accepted'; END IF;
  IF NOT public.renew_background_task('claim-test',first_owner) THEN RAISE EXCEPTION 'Active owner could not renew'; END IF;
  IF NOT public.finish_background_task('claim-test',first_owner,'finished','result') THEN RAISE EXCEPTION 'Active owner could not finish'; END IF;
  IF public.finish_background_task('claim-test',first_owner,'error','late failure') OR public.renew_background_task('claim-test',first_owner) THEN RAISE EXCEPTION 'Terminal record changed'; END IF;
  SELECT * INTO b FROM public.claim_background_task('claim-test',second_owner,'replayed');
  IF b.state <> 'finished' OR b.snapshot <> 'result' OR NOT b.recovery_pending THEN RAISE EXCEPTION 'Completed task restarted or recovery lost'; END IF;
  UPDATE public.task_claims SET recovery_pending=false WHERE task_id='claim-test';

  SELECT * INTO a FROM public.claim_background_task('expiry-test',first_owner,'recoverable-input');
  UPDATE public.task_claims SET expires_at=clock_timestamp()-interval '1 second' WHERE task_id='expiry-test';
  IF public.renew_background_task('expiry-test',first_owner) OR public.finish_background_task('expiry-test',first_owner,'finished','stale') THEN RAISE EXCEPTION 'Expired owner accepted'; END IF;
  PERFORM public.expire_background_tasks();
  SELECT * INTO b FROM public.claim_background_task('expiry-test',second_owner,'replayed');
  IF b.state <> 'error' OR b.snapshot <> 'recoverable-input' OR b.completed_at IS NULL OR NOT b.recovery_pending THEN RAISE EXCEPTION 'Expired task not recoverable'; END IF;
  PERFORM public.expire_background_tasks();
  IF NOT (SELECT recovery_pending FROM public.task_claims WHERE task_id='expiry-test') THEN RAISE EXCEPTION 'Recovery retry flag disappeared'; END IF;
END;
$$;
RESET ROLE;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_table_privilege(role_name,'public.task_claims','SELECT') OR has_table_privilege(role_name,'public.task_claims','INSERT') OR
       has_table_privilege(role_name,'public.task_claims','UPDATE') OR has_table_privilege(role_name,'public.task_claims','DELETE') THEN RAISE EXCEPTION 'Public task ledger access'; END IF;
    IF has_function_privilege(role_name,'public.claim_background_task(text,uuid,text,text)','EXECUTE') OR
       has_function_privilege(role_name,'public.renew_background_task(text,uuid)','EXECUTE') OR
       has_function_privilege(role_name,'public.finish_background_task(text,uuid,text,text)','EXECUTE') OR
       has_function_privilege(role_name,'public.expire_background_tasks()','EXECUTE') THEN RAISE EXCEPTION 'Public claim RPC access'; END IF;
  END LOOP;
END;
$$;
ROLLBACK;
