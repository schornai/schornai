SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.prune_task_claim_snapshots()
  RETURNS integer
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare removed integer;
begin
  with eligible as (
    select task_id from public.task_claims
    where state <> 'claimed' and not recovery_pending and snapshot is not null
      and completed_at < clock_timestamp() - interval '24 hours'
    order by completed_at limit 1000 for update skip locked
  )
  update public.task_claims as task set snapshot = null
    from eligible where task.task_id = eligible.task_id;
  get diagnostics removed = row_count;
  return removed;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."prune_task_claim_snapshots"() FROM PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."prune_task_claim_snapshots"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."prune_task_claim_snapshots"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."prune_task_claim_snapshots"() TO "service_role";
