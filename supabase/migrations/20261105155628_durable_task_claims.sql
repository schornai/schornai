SET local check_function_bodies = off;

CREATE TABLE "public"."task_claims" (
  "task_id"          text                     NOT NULL,
  "owner_token"      uuid                     NOT NULL,
  "state"            text                     NOT NULL,
  "snapshot"         text,
  "expires_at"       timestamp with time zone NOT NULL,
  "completed_at"     timestamp with time zone,
  "recovery_pending" boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "task_claims_check1" CHECK (((state <> 'claimed'::text) OR (snapshot IS NOT NULL))),
  CONSTRAINT "task_claims_check" CHECK (((state = 'claimed'::text) = (completed_at IS NULL))),
  CONSTRAINT "task_claims_pkey" PRIMARY KEY (task_id),
  CONSTRAINT "task_claims_state_check" CHECK ((state = ANY (ARRAY['claimed'::text, 'finished'::text, 'aborted'::text, 'error'::text])))
);

ALTER TABLE "public"."task_claims"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."task_claims" FROM "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.claim_background_task (
  p_task_id     text,
  p_owner_token uuid,
  p_snapshot    text
)
  RETURNS SETOF public.task_claims
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  insert into public.task_claims(task_id, owner_token, state, snapshot, expires_at)
    values(p_task_id, p_owner_token, 'claimed', p_snapshot, clock_timestamp() + interval '90 seconds')
    on conflict (task_id) do nothing;
  return query select * from public.task_claims where task_id = p_task_id;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."claim_background_task"(text, uuid, text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.expire_background_tasks()
  RETURNS SETOF public.task_claims
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  return query update public.task_claims set state = 'error', completed_at = clock_timestamp(), recovery_pending = true
    where state = 'claimed' and expires_at <= clock_timestamp() returning *;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."expire_background_tasks"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.finish_background_task (
  p_task_id     text,
  p_owner_token uuid,
  p_state       text,
  p_snapshot    text
)
  RETURNS boolean
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if p_state not in ('finished', 'aborted', 'error') then raise exception 'INVALID_TASK_STATE'; end if;
  update public.task_claims set state = p_state, snapshot = p_snapshot, completed_at = clock_timestamp(), recovery_pending = true
    where task_id = p_task_id and owner_token = p_owner_token and state = 'claimed' and expires_at > clock_timestamp();
  return found;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."finish_background_task"(text, uuid, text, text) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.renew_background_task (
  p_task_id     text,
  p_owner_token uuid
)
  RETURNS boolean
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  with renewed as (
    update public.task_claims set expires_at = clock_timestamp() + interval '90 seconds'
    where task_id = p_task_id and owner_token = p_owner_token and state = 'claimed' and expires_at > clock_timestamp()
    returning 1
  ) select exists(select 1 from renewed);
$function$;

REVOKE ALL ON FUNCTION "public"."renew_background_task"(text, uuid) FROM PUBLIC, "anon", "authenticated";

CREATE INDEX task_claims_active_expiry_idx ON public.task_claims USING btree (expires_at)
  WHERE (state = 'claimed'::text);

CREATE INDEX task_claims_recovery_idx ON public.task_claims USING btree (task_id)
  WHERE recovery_pending;

CREATE INDEX task_claims_snapshot_cleanup_idx ON public.task_claims USING btree (completed_at)
  WHERE ((snapshot IS NOT NULL) AND (state <> 'claimed'::text));

REVOKE ALL ON FUNCTION "public"."claim_background_task"(text, uuid, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."claim_background_task"(text, uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."claim_background_task"(text, uuid, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."expire_background_tasks"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."expire_background_tasks"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."expire_background_tasks"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."finish_background_task"(text, uuid, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."finish_background_task"(text, uuid, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."finish_background_task"(text, uuid, text, text) TO "service_role";

REVOKE ALL ON FUNCTION "public"."renew_background_task"(text, uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."renew_background_task"(text, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."renew_background_task"(text, uuid) TO "service_role";

REVOKE ALL ON TABLE "public"."task_claims" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_claims" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_claims" TO "service_role";
