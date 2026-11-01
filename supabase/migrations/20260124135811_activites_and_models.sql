create type "public"."activity_type" as enum ('chat');


  create table "public"."activities" (
    "id" text not null default public.generate_custom_id(),
    "created_at" timestamp with time zone not null default now(),
    "label" text not null,
    "type" public.activity_type not null,
    "content" jsonb not null,
    "user_id" uuid not null,
    "pinned" boolean not null
      );


alter table "public"."activities" enable row level security;


  create table "public"."box_runtime_states" (
    "id" text not null default public.generate_custom_id(),
    "created_at" timestamp with time zone not null default now(),
    "expires_at" timestamp with time zone not null,
    "model_identifier" text not null,
    "current_streams" numeric not null,
    "box_id" uuid not null
      );


alter table "public"."box_runtime_states" enable row level security;


  create table "public"."settings_user" (
    "id" text not null default public.generate_custom_id(),
    "created_at" timestamp with time zone not null default now(),
    "user_id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "value" jsonb not null
      );


alter table "public"."settings_user" enable row level security;

alter table "public"."boxes" add column "location" text;

CREATE UNIQUE INDEX activities_pkey ON public.activities USING btree (id);

CREATE UNIQUE INDEX box_runtime_states_box_model_uniq ON public.box_runtime_states USING btree (box_id, model_identifier);

CREATE UNIQUE INDEX box_runtime_states_pkey ON public.box_runtime_states USING btree (id);

CREATE UNIQUE INDEX settings_user_pkey ON public.settings_user USING btree (id);

alter table "public"."activities" add constraint "activities_pkey" PRIMARY KEY using index "activities_pkey";

alter table "public"."box_runtime_states" add constraint "box_runtime_states_pkey" PRIMARY KEY using index "box_runtime_states_pkey";

alter table "public"."settings_user" add constraint "settings_user_pkey" PRIMARY KEY using index "settings_user_pkey";

alter table "public"."activities" add constraint "activities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."activities" validate constraint "activities_user_id_fkey";

alter table "public"."box_runtime_states" add constraint "box_runtime_states_box_id_fkey" FOREIGN KEY (box_id) REFERENCES public.boxes(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."box_runtime_states" validate constraint "box_runtime_states_box_id_fkey";

alter table "public"."box_runtime_states" add constraint "box_runtime_states_box_model_uniq" UNIQUE using index "box_runtime_states_box_model_uniq";

alter table "public"."settings_user" add constraint "settings_user_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."settings_user" validate constraint "settings_user_user_id_fkey";

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

grant delete on table "public"."activities" to "anon";

grant insert on table "public"."activities" to "anon";

grant references on table "public"."activities" to "anon";

grant select on table "public"."activities" to "anon";

grant trigger on table "public"."activities" to "anon";

grant truncate on table "public"."activities" to "anon";

grant update on table "public"."activities" to "anon";

grant delete on table "public"."activities" to "authenticated";

grant insert on table "public"."activities" to "authenticated";

grant references on table "public"."activities" to "authenticated";

grant select on table "public"."activities" to "authenticated";

grant trigger on table "public"."activities" to "authenticated";

grant truncate on table "public"."activities" to "authenticated";

grant update on table "public"."activities" to "authenticated";

grant delete on table "public"."activities" to "postgres";

grant insert on table "public"."activities" to "postgres";

grant references on table "public"."activities" to "postgres";

grant select on table "public"."activities" to "postgres";

grant trigger on table "public"."activities" to "postgres";

grant truncate on table "public"."activities" to "postgres";

grant update on table "public"."activities" to "postgres";

grant delete on table "public"."activities" to "service_role";

grant insert on table "public"."activities" to "service_role";

grant references on table "public"."activities" to "service_role";

grant select on table "public"."activities" to "service_role";

grant trigger on table "public"."activities" to "service_role";

grant truncate on table "public"."activities" to "service_role";

grant update on table "public"."activities" to "service_role";

grant delete on table "public"."box_runtime_states" to "anon";

grant insert on table "public"."box_runtime_states" to "anon";

grant references on table "public"."box_runtime_states" to "anon";

grant select on table "public"."box_runtime_states" to "anon";

grant trigger on table "public"."box_runtime_states" to "anon";

grant truncate on table "public"."box_runtime_states" to "anon";

grant update on table "public"."box_runtime_states" to "anon";

grant delete on table "public"."box_runtime_states" to "authenticated";

grant insert on table "public"."box_runtime_states" to "authenticated";

grant references on table "public"."box_runtime_states" to "authenticated";

grant select on table "public"."box_runtime_states" to "authenticated";

grant trigger on table "public"."box_runtime_states" to "authenticated";

grant truncate on table "public"."box_runtime_states" to "authenticated";

grant update on table "public"."box_runtime_states" to "authenticated";

grant delete on table "public"."box_runtime_states" to "postgres";

grant insert on table "public"."box_runtime_states" to "postgres";

grant references on table "public"."box_runtime_states" to "postgres";

grant select on table "public"."box_runtime_states" to "postgres";

grant trigger on table "public"."box_runtime_states" to "postgres";

grant truncate on table "public"."box_runtime_states" to "postgres";

grant update on table "public"."box_runtime_states" to "postgres";

grant delete on table "public"."box_runtime_states" to "service_role";

grant insert on table "public"."box_runtime_states" to "service_role";

grant references on table "public"."box_runtime_states" to "service_role";

grant select on table "public"."box_runtime_states" to "service_role";

grant trigger on table "public"."box_runtime_states" to "service_role";

grant truncate on table "public"."box_runtime_states" to "service_role";

grant update on table "public"."box_runtime_states" to "service_role";

grant delete on table "public"."settings_user" to "anon";

grant insert on table "public"."settings_user" to "anon";

grant references on table "public"."settings_user" to "anon";

grant select on table "public"."settings_user" to "anon";

grant trigger on table "public"."settings_user" to "anon";

grant truncate on table "public"."settings_user" to "anon";

grant update on table "public"."settings_user" to "anon";

grant delete on table "public"."settings_user" to "authenticated";

grant insert on table "public"."settings_user" to "authenticated";

grant references on table "public"."settings_user" to "authenticated";

grant select on table "public"."settings_user" to "authenticated";

grant trigger on table "public"."settings_user" to "authenticated";

grant truncate on table "public"."settings_user" to "authenticated";

grant update on table "public"."settings_user" to "authenticated";

grant delete on table "public"."settings_user" to "postgres";

grant insert on table "public"."settings_user" to "postgres";

grant references on table "public"."settings_user" to "postgres";

grant select on table "public"."settings_user" to "postgres";

grant trigger on table "public"."settings_user" to "postgres";

grant truncate on table "public"."settings_user" to "postgres";

grant update on table "public"."settings_user" to "postgres";

grant delete on table "public"."settings_user" to "service_role";

grant insert on table "public"."settings_user" to "service_role";

grant references on table "public"."settings_user" to "service_role";

grant select on table "public"."settings_user" to "service_role";

grant trigger on table "public"."settings_user" to "service_role";

grant truncate on table "public"."settings_user" to "service_role";

grant update on table "public"."settings_user" to "service_role";


INSERT INTO storage.buckets (id, name, public) VALUES ('activity_files', 'activity_files', false);





  create policy "Users can see runtime states"
  on "public"."box_runtime_states"
  as permissive
  for select
  to public
using (public.authorize('user'::public.user_role));



  create policy "Allow users to manage their own settings"
  on "public"."settings_user"
  as permissive
  for all
  to public
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Let users manage their own activity files 10tgu2v_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'activity_files'::text) AND (EXISTS ( SELECT 1
   FROM public.activities
  WHERE (activities.id = (storage.foldername(objects.name))[1])))));



  create policy "Let users manage their own activity files 10tgu2v_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'activity_files'::text) AND (EXISTS ( SELECT 1
   FROM public.activities
  WHERE (activities.id = (storage.foldername(objects.name))[1])))));



  create policy "Let users manage their own activity files 10tgu2v_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'activity_files'::text) AND (EXISTS ( SELECT 1
   FROM public.activities
  WHERE (activities.id = (storage.foldername(objects.name))[1])))));



  create policy "Let users manage their own activity files 10tgu2v_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'activity_files'::text) AND (EXISTS ( SELECT 1
   FROM public.activities
  WHERE (activities.id = (storage.foldername(objects.name))[1])))));



