create type "public"."activity_worker_state" as enum ('pending', 'running', 'success', 'error');

alter type "public"."activity_type" rename to "activity_type__old_version_to_be_dropped";

create type "public"."activity_type" as enum ('chat', 'transcribe');


  create table "public"."transcribers" (
    "id" text not null default public.generate_custom_id(),
    "created_at" timestamp with time zone not null default now(),
    "name" text,
    "description" text,
    "ai_model_id" text,
    "prompt" text,
    "config" jsonb,
    "organization_id" text not null
      );


alter table "public"."transcribers" enable row level security;


  create table "public"."transcriptions" (
    "id" text not null default public.generate_custom_id(),
    "created_at" timestamp with time zone not null default now(),
    "content" jsonb,
    "transcriber_id" text,
    "user_id" uuid not null,
    "file_full_path" text,
    "summary" text
      );


alter table "public"."transcriptions" enable row level security;

alter table "public"."activities" alter column type type "public"."activity_type" using type::text::"public"."activity_type";

drop type "public"."activity_type__old_version_to_be_dropped";

alter table "public"."activities" add column "worker_state" public.activity_worker_state;

CREATE UNIQUE INDEX transcribers_pkey ON public.transcribers USING btree (id);

CREATE UNIQUE INDEX transcriptions_pkey ON public.transcriptions USING btree (id);

alter table "public"."transcribers" add constraint "transcribers_pkey" PRIMARY KEY using index "transcribers_pkey";

alter table "public"."transcriptions" add constraint "transcriptions_pkey" PRIMARY KEY using index "transcriptions_pkey";

alter table "public"."transcribers" add constraint "transcribers_ai_model_id_fkey" FOREIGN KEY (ai_model_id) REFERENCES public.ai_models(id) ON DELETE SET NULL not valid;

alter table "public"."transcribers" validate constraint "transcribers_ai_model_id_fkey";

alter table "public"."transcribers" add constraint "transcribers_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."transcribers" validate constraint "transcribers_organization_id_fkey";

alter table "public"."transcriptions" add constraint "transcriptions_transcriber_id_fkey" FOREIGN KEY (transcriber_id) REFERENCES public.transcribers(id) ON DELETE SET NULL not valid;

alter table "public"."transcriptions" validate constraint "transcriptions_transcriber_id_fkey";

alter table "public"."transcriptions" add constraint "transcriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."transcriptions" validate constraint "transcriptions_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.decrement_current_streams(p_box_id uuid, p_model_identifier text)
 RETURNS void
 LANGUAGE sql
AS $function$
    UPDATE box_runtime_states
    SET current_streams = GREATEST(current_streams - 1, 0)
    WHERE box_id = p_box_id
      AND model_identifier = p_model_identifier;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_current_streams(p_box_id uuid, p_model_identifier text)
 RETURNS void
 LANGUAGE sql
AS $function$
    INSERT INTO box_runtime_states (box_id, model_identifier, current_streams, expires_at)
    VALUES (p_box_id, p_model_identifier, 1, clock_timestamp() + interval '5 minutes')
    ON CONFLICT (box_id, model_identifier)
    DO UPDATE
        SET current_streams = box_runtime_states.current_streams + 1,
            expires_at = clock_timestamp() + interval '5 minutes';
$function$
;

grant delete on table "public"."activities" to "postgres";

grant insert on table "public"."activities" to "postgres";

grant references on table "public"."activities" to "postgres";

grant select on table "public"."activities" to "postgres";

grant trigger on table "public"."activities" to "postgres";

grant truncate on table "public"."activities" to "postgres";

grant update on table "public"."activities" to "postgres";

grant delete on table "public"."box_runtime_states" to "postgres";

grant insert on table "public"."box_runtime_states" to "postgres";

grant references on table "public"."box_runtime_states" to "postgres";

grant select on table "public"."box_runtime_states" to "postgres";

grant trigger on table "public"."box_runtime_states" to "postgres";

grant truncate on table "public"."box_runtime_states" to "postgres";

grant update on table "public"."box_runtime_states" to "postgres";

grant delete on table "public"."settings_user" to "postgres";

grant insert on table "public"."settings_user" to "postgres";

grant references on table "public"."settings_user" to "postgres";

grant select on table "public"."settings_user" to "postgres";

grant trigger on table "public"."settings_user" to "postgres";

grant truncate on table "public"."settings_user" to "postgres";

grant update on table "public"."settings_user" to "postgres";

grant delete on table "public"."transcribers" to "anon";

grant insert on table "public"."transcribers" to "anon";

grant references on table "public"."transcribers" to "anon";

grant select on table "public"."transcribers" to "anon";

grant trigger on table "public"."transcribers" to "anon";

grant truncate on table "public"."transcribers" to "anon";

grant update on table "public"."transcribers" to "anon";

grant delete on table "public"."transcribers" to "authenticated";

grant insert on table "public"."transcribers" to "authenticated";

grant references on table "public"."transcribers" to "authenticated";

grant select on table "public"."transcribers" to "authenticated";

grant trigger on table "public"."transcribers" to "authenticated";

grant truncate on table "public"."transcribers" to "authenticated";

grant update on table "public"."transcribers" to "authenticated";

grant delete on table "public"."transcribers" to "postgres";

grant insert on table "public"."transcribers" to "postgres";

grant references on table "public"."transcribers" to "postgres";

grant select on table "public"."transcribers" to "postgres";

grant trigger on table "public"."transcribers" to "postgres";

grant truncate on table "public"."transcribers" to "postgres";

grant update on table "public"."transcribers" to "postgres";

grant delete on table "public"."transcribers" to "service_role";

grant insert on table "public"."transcribers" to "service_role";

grant references on table "public"."transcribers" to "service_role";

grant select on table "public"."transcribers" to "service_role";

grant trigger on table "public"."transcribers" to "service_role";

grant truncate on table "public"."transcribers" to "service_role";

grant update on table "public"."transcribers" to "service_role";

grant delete on table "public"."transcriptions" to "anon";

grant insert on table "public"."transcriptions" to "anon";

grant references on table "public"."transcriptions" to "anon";

grant select on table "public"."transcriptions" to "anon";

grant trigger on table "public"."transcriptions" to "anon";

grant truncate on table "public"."transcriptions" to "anon";

grant update on table "public"."transcriptions" to "anon";

grant delete on table "public"."transcriptions" to "authenticated";

grant insert on table "public"."transcriptions" to "authenticated";

grant references on table "public"."transcriptions" to "authenticated";

grant select on table "public"."transcriptions" to "authenticated";

grant trigger on table "public"."transcriptions" to "authenticated";

grant truncate on table "public"."transcriptions" to "authenticated";

grant update on table "public"."transcriptions" to "authenticated";

grant delete on table "public"."transcriptions" to "postgres";

grant insert on table "public"."transcriptions" to "postgres";

grant references on table "public"."transcriptions" to "postgres";

grant select on table "public"."transcriptions" to "postgres";

grant trigger on table "public"."transcriptions" to "postgres";

grant truncate on table "public"."transcriptions" to "postgres";

grant update on table "public"."transcriptions" to "postgres";

grant delete on table "public"."transcriptions" to "service_role";

grant insert on table "public"."transcriptions" to "service_role";

grant references on table "public"."transcriptions" to "service_role";

grant select on table "public"."transcriptions" to "service_role";

grant trigger on table "public"."transcriptions" to "service_role";

grant truncate on table "public"."transcriptions" to "service_role";

grant update on table "public"."transcriptions" to "service_role";


  create policy "Users delete own activities"
  on "public"."activities"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users insert own activities"
  on "public"."activities"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users update own activities"
  on "public"."activities"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users view own activities"
  on "public"."activities"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Allow editors to manage transcribers"
  on "public"."transcribers"
  as permissive
  for all
  to public
using (public.authorize('editor'::public.user_role, organization_id))
with check (public.authorize('editor'::public.user_role, organization_id));



  create policy "Allow users to see transcribers"
  on "public"."transcribers"
  as permissive
  for select
  to public
using (public.authorize('user'::public.user_role, organization_id));



  create policy "Allow users to manage their own transcriptions"
  on "public"."transcriptions"
  as permissive
  for all
  to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



