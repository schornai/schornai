create table "public"."user_password_reset_key" (
    "id" text not null default generate_custom_id(),
    "created_at" timestamp with time zone not null default now(),
    "reset_key" text not null,
    "for_user_id" uuid not null,
    "expires" timestamp with time zone not null,
    "used" timestamp with time zone
);


alter table "public"."user_password_reset_key" enable row level security;

CREATE UNIQUE INDEX user_password_reset_key_pkey ON public.user_password_reset_key USING btree (id);

alter table "public"."user_password_reset_key" add constraint "user_password_reset_key_pkey" PRIMARY KEY using index "user_password_reset_key_pkey";

alter table "public"."user_password_reset_key" add constraint "user_password_reset_key_for_user_id_fkey" FOREIGN KEY (for_user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."user_password_reset_key" validate constraint "user_password_reset_key_for_user_id_fkey";

grant delete on table "public"."user_password_reset_key" to "anon";

grant insert on table "public"."user_password_reset_key" to "anon";

grant references on table "public"."user_password_reset_key" to "anon";

grant select on table "public"."user_password_reset_key" to "anon";

grant trigger on table "public"."user_password_reset_key" to "anon";

grant truncate on table "public"."user_password_reset_key" to "anon";

grant update on table "public"."user_password_reset_key" to "anon";

grant delete on table "public"."user_password_reset_key" to "authenticated";

grant insert on table "public"."user_password_reset_key" to "authenticated";

grant references on table "public"."user_password_reset_key" to "authenticated";

grant select on table "public"."user_password_reset_key" to "authenticated";

grant trigger on table "public"."user_password_reset_key" to "authenticated";

grant truncate on table "public"."user_password_reset_key" to "authenticated";

grant update on table "public"."user_password_reset_key" to "authenticated";

grant delete on table "public"."user_password_reset_key" to "service_role";

grant insert on table "public"."user_password_reset_key" to "service_role";

grant references on table "public"."user_password_reset_key" to "service_role";

grant select on table "public"."user_password_reset_key" to "service_role";

grant trigger on table "public"."user_password_reset_key" to "service_role";

grant truncate on table "public"."user_password_reset_key" to "service_role";

grant update on table "public"."user_password_reset_key" to "service_role";

create policy "Allow admins to manage keys"
on "public"."user_password_reset_key"
as permissive
for all
to public
using (authorize('admin'::user_role));



