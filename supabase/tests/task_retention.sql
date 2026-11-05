-- Run with psql -v ON_ERROR_STOP=1 against a migrated local Supabase database.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE removed integer; retained public.task_claims; original_owner uuid := gen_random_uuid();
BEGIN
  -- Existing local records must not affect the batch-count assertion.
  UPDATE public.task_claims SET completed_at=clock_timestamp() WHERE state <> 'claimed';
  INSERT INTO public.task_claims(task_id, owner_token, state, snapshot, expires_at, completed_at)
  SELECT 'retention-'||n, original_owner, 'finished', 'old-payload', clock_timestamp()-interval '2 days', clock_timestamp()-interval '2 days'
  FROM generate_series(1,1005) n;
  INSERT INTO public.task_claims(task_id, owner_token, state, snapshot, expires_at, completed_at, recovery_pending) VALUES
    ('retention-active',original_owner,'claimed','active',clock_timestamp()+interval '90 seconds',null,false),
    ('retention-unrecovered',original_owner,'error','recovery',clock_timestamp()-interval '2 days',clock_timestamp()-interval '2 days',true),
    ('retention-recent',original_owner,'finished','recent',clock_timestamp(),clock_timestamp(),false);
  removed := public.prune_task_claim_snapshots();
  IF removed <> 1000 THEN RAISE EXCEPTION 'Cleanup batch was not bounded: %', removed; END IF;
  IF public.prune_task_claim_snapshots() <> 5 THEN RAISE EXCEPTION 'Remaining old payloads were not pruned'; END IF;
  IF public.prune_task_claim_snapshots() <> 0 THEN RAISE EXCEPTION 'Cleanup is not idempotent'; END IF;
  IF (SELECT count(*) FROM public.task_claims WHERE task_id LIKE 'retention-%') <> 1008 THEN RAISE EXCEPTION 'Replay records were deleted'; END IF;
  IF EXISTS(SELECT 1 FROM public.task_claims WHERE task_id IN ('retention-active','retention-unrecovered','retention-recent') AND snapshot IS NULL) THEN RAISE EXCEPTION 'Required payload removed'; END IF;
  SELECT * INTO retained FROM public.claim_background_task('retention-1',gen_random_uuid(),'replayed');
  IF retained.owner_token <> original_owner OR retained.state <> 'finished' OR retained.snapshot IS NOT NULL THEN RAISE EXCEPTION 'Pruned task was granted again'; END IF;
END;
$$;
RESET ROLE;
DO $$
BEGIN
  IF has_function_privilege('anon','public.prune_task_claim_snapshots()','EXECUTE') OR has_function_privilege('authenticated','public.prune_task_claim_snapshots()','EXECUTE') THEN RAISE EXCEPTION 'Public cleanup access'; END IF;
END;
$$;
ROLLBACK;
