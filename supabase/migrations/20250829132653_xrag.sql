create type "public"."box_xrag_action_state" as enum ('pending', 'running', 'success', 'error');

create table "public"."box_xrag_actions" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone not null default now(),
    "box_id" uuid not null,
    "state" box_xrag_action_state not null,
    "xrag_file_name" text not null
);


alter table "public"."box_xrag_actions" enable row level security;

create table "public"."boxes" (
    "id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "name" text,
    "description" text
);


alter table "public"."boxes" enable row level security;

CREATE UNIQUE INDEX box_xrag_actions_pkey ON public.box_xrag_actions USING btree (id);

CREATE UNIQUE INDEX boxes_pkey ON public.boxes USING btree (id);

alter table "public"."box_xrag_actions" add constraint "box_xrag_actions_pkey" PRIMARY KEY using index "box_xrag_actions_pkey";

alter table "public"."boxes" add constraint "boxes_pkey" PRIMARY KEY using index "boxes_pkey";

alter table "public"."box_xrag_actions" add constraint "box_xrag_actions_box_fkey" FOREIGN KEY (box_id) REFERENCES boxes(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."box_xrag_actions" validate constraint "box_xrag_actions_box_fkey";

grant delete on table "public"."box_xrag_actions" to "anon";

grant insert on table "public"."box_xrag_actions" to "anon";

grant references on table "public"."box_xrag_actions" to "anon";

grant select on table "public"."box_xrag_actions" to "anon";

grant trigger on table "public"."box_xrag_actions" to "anon";

grant truncate on table "public"."box_xrag_actions" to "anon";

grant update on table "public"."box_xrag_actions" to "anon";

grant delete on table "public"."box_xrag_actions" to "authenticated";

grant insert on table "public"."box_xrag_actions" to "authenticated";

grant references on table "public"."box_xrag_actions" to "authenticated";

grant select on table "public"."box_xrag_actions" to "authenticated";

grant trigger on table "public"."box_xrag_actions" to "authenticated";

grant truncate on table "public"."box_xrag_actions" to "authenticated";

grant update on table "public"."box_xrag_actions" to "authenticated";

grant delete on table "public"."box_xrag_actions" to "service_role";

grant insert on table "public"."box_xrag_actions" to "service_role";

grant references on table "public"."box_xrag_actions" to "service_role";

grant select on table "public"."box_xrag_actions" to "service_role";

grant trigger on table "public"."box_xrag_actions" to "service_role";

grant truncate on table "public"."box_xrag_actions" to "service_role";

grant update on table "public"."box_xrag_actions" to "service_role";

grant delete on table "public"."boxes" to "anon";

grant insert on table "public"."boxes" to "anon";

grant references on table "public"."boxes" to "anon";

grant select on table "public"."boxes" to "anon";

grant trigger on table "public"."boxes" to "anon";

grant truncate on table "public"."boxes" to "anon";

grant update on table "public"."boxes" to "anon";

grant delete on table "public"."boxes" to "authenticated";

grant insert on table "public"."boxes" to "authenticated";

grant references on table "public"."boxes" to "authenticated";

grant select on table "public"."boxes" to "authenticated";

grant trigger on table "public"."boxes" to "authenticated";

grant truncate on table "public"."boxes" to "authenticated";

grant update on table "public"."boxes" to "authenticated";

grant delete on table "public"."boxes" to "service_role";

grant insert on table "public"."boxes" to "service_role";

grant references on table "public"."boxes" to "service_role";

grant select on table "public"."boxes" to "service_role";

grant trigger on table "public"."boxes" to "service_role";

grant truncate on table "public"."boxes" to "service_role";

grant update on table "public"."boxes" to "service_role";

create policy "Admins can manage actions"
on "public"."box_xrag_actions"
as permissive
for all
to public
using (authorize('admin'::user_role));


create policy "Admin can manage boxes"
on "public"."boxes"
as permissive
for all
to public
using (authorize('admin'::user_role));


create policy "Users can see all boxes"
on "public"."boxes"
as permissive
for select
to public
using (authorize('user'::user_role));


INSERT INTO storage.buckets (id, name, public) VALUES ('box-action-files', 'box-action-files', false);

create policy "Admins can manage box action files erpale_0"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'box-action-files'::text) AND authorize('admin'::user_role)));


create policy "Admins can manage box action files erpale_1"
on "storage"."objects"
as permissive
for delete
to public
using (((bucket_id = 'box-action-files'::text) AND authorize('admin'::user_role)));


create policy "Admins can manage box action files erpale_2"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'box-action-files'::text) AND authorize('admin'::user_role)));


ALTER PUBLICATION supabase_realtime ADD TABLE box_xrag_actions;