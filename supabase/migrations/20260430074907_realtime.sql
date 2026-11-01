
  create table "public"."realtime_document_access" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid not null,
    "user_id" uuid not null
      );


alter table "public"."realtime_document_access" enable row level security;


  create table "public"."realtime_documents" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "document_name" text not null,
    "document_data" bytea
      );

INSERT INTO storage.buckets (id, name, public) VALUES ('realtime_files', 'realtime_files', false);


alter table "public"."realtime_documents" enable row level security;

CREATE UNIQUE INDEX realtime_document_access_pkey ON public.realtime_document_access USING btree (id);

CREATE UNIQUE INDEX realtime_documents_document_name_key ON public.realtime_documents USING btree (document_name);

CREATE UNIQUE INDEX realtime_documents_pkey ON public.realtime_documents USING btree (id);

alter table "public"."realtime_document_access" add constraint "realtime_document_access_pkey" PRIMARY KEY using index "realtime_document_access_pkey";

alter table "public"."realtime_documents" add constraint "realtime_documents_pkey" PRIMARY KEY using index "realtime_documents_pkey";

alter table "public"."realtime_document_access" add constraint "realtime_document_access_document_id_fkey" FOREIGN KEY (document_id) REFERENCES public.realtime_documents(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."realtime_document_access" validate constraint "realtime_document_access_document_id_fkey";

alter table "public"."realtime_document_access" add constraint "realtime_document_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."realtime_document_access" validate constraint "realtime_document_access_user_id_fkey";

alter table "public"."realtime_documents" add constraint "realtime_documents_document_name_key" UNIQUE using index "realtime_documents_document_name_key";

grant delete on table "public"."realtime_document_access" to "anon";

grant insert on table "public"."realtime_document_access" to "anon";

grant references on table "public"."realtime_document_access" to "anon";

grant select on table "public"."realtime_document_access" to "anon";

grant trigger on table "public"."realtime_document_access" to "anon";

grant truncate on table "public"."realtime_document_access" to "anon";

grant update on table "public"."realtime_document_access" to "anon";

grant delete on table "public"."realtime_document_access" to "authenticated";

grant insert on table "public"."realtime_document_access" to "authenticated";

grant references on table "public"."realtime_document_access" to "authenticated";

grant select on table "public"."realtime_document_access" to "authenticated";

grant trigger on table "public"."realtime_document_access" to "authenticated";

grant truncate on table "public"."realtime_document_access" to "authenticated";

grant update on table "public"."realtime_document_access" to "authenticated";

grant delete on table "public"."realtime_document_access" to "service_role";

grant insert on table "public"."realtime_document_access" to "service_role";

grant references on table "public"."realtime_document_access" to "service_role";

grant select on table "public"."realtime_document_access" to "service_role";

grant trigger on table "public"."realtime_document_access" to "service_role";

grant truncate on table "public"."realtime_document_access" to "service_role";

grant update on table "public"."realtime_document_access" to "service_role";

grant delete on table "public"."realtime_documents" to "anon";

grant insert on table "public"."realtime_documents" to "anon";

grant references on table "public"."realtime_documents" to "anon";

grant select on table "public"."realtime_documents" to "anon";

grant trigger on table "public"."realtime_documents" to "anon";

grant truncate on table "public"."realtime_documents" to "anon";

grant update on table "public"."realtime_documents" to "anon";

grant delete on table "public"."realtime_documents" to "authenticated";

grant insert on table "public"."realtime_documents" to "authenticated";

grant references on table "public"."realtime_documents" to "authenticated";

grant select on table "public"."realtime_documents" to "authenticated";

grant trigger on table "public"."realtime_documents" to "authenticated";

grant truncate on table "public"."realtime_documents" to "authenticated";

grant update on table "public"."realtime_documents" to "authenticated";

grant delete on table "public"."realtime_documents" to "service_role";

grant insert on table "public"."realtime_documents" to "service_role";

grant references on table "public"."realtime_documents" to "service_role";

grant select on table "public"."realtime_documents" to "service_role";

grant trigger on table "public"."realtime_documents" to "service_role";

grant truncate on table "public"."realtime_documents" to "service_role";

grant update on table "public"."realtime_documents" to "service_role";


  create policy "Allow users to select their own access"
  on "public"."realtime_document_access"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Allow users to select their own documents"
  on "public"."realtime_documents"
  as permissive
  for select
  to public
using ((id IN ( SELECT realtime_document_access.document_id
   FROM public.realtime_document_access)));



  create policy "Allow users to manage own realtime files 1bsbd0j_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'realtime_files'::text) AND (EXISTS ( SELECT 1
   FROM public.realtime_documents
  WHERE (realtime_documents.document_name = (storage.foldername(objects.name))[1])))));



  create policy "Allow users to manage own realtime files 1bsbd0j_1"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'realtime_files'::text) AND (EXISTS ( SELECT 1
   FROM public.realtime_documents
  WHERE (realtime_documents.document_name = (storage.foldername(objects.name))[1])))));



  create policy "Allow users to manage own realtime files 1bsbd0j_2"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'realtime_files'::text) AND (EXISTS ( SELECT 1
   FROM public.realtime_documents
  WHERE (realtime_documents.document_name = (storage.foldername(objects.name))[1])))));



  create policy "Allow users to manage own realtime files 1bsbd0j_3"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'realtime_files'::text) AND (EXISTS ( SELECT 1
   FROM public.realtime_documents
  WHERE (realtime_documents.document_name = (storage.foldername(objects.name))[1])))));



