create type "public"."ai_model_type" as enum ('ollama_llm_v1', 'ollama_embedding_v1', 'mlx_whisper_v1');


  create table "public"."ai_models" (
    "id" text not null default public.generate_custom_id(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text,
    "image" jsonb,
    "identifier" text not null,
    "config" jsonb not null,
    "type" public.ai_model_type not null
      );


alter table "public"."ai_models" enable row level security;

alter table "public"."organizations" add column "saml_mapping_editor" text;

alter table "public"."organizations" add column "saml_mapping_user" text;

CREATE UNIQUE INDEX ai_models_identifier_key ON public.ai_models USING btree (identifier);

CREATE UNIQUE INDEX ai_models_pkey ON public.ai_models USING btree (id);

alter table "public"."ai_models" add constraint "ai_models_pkey" PRIMARY KEY using index "ai_models_pkey";

alter table "public"."ai_models" add constraint "ai_models_identifier_key" UNIQUE using index "ai_models_identifier_key";

grant delete on table "public"."ai_models" to "anon";

grant insert on table "public"."ai_models" to "anon";

grant references on table "public"."ai_models" to "anon";

grant select on table "public"."ai_models" to "anon";

grant trigger on table "public"."ai_models" to "anon";

grant truncate on table "public"."ai_models" to "anon";

grant update on table "public"."ai_models" to "anon";

grant delete on table "public"."ai_models" to "authenticated";

grant insert on table "public"."ai_models" to "authenticated";

grant references on table "public"."ai_models" to "authenticated";

grant select on table "public"."ai_models" to "authenticated";

grant trigger on table "public"."ai_models" to "authenticated";

grant truncate on table "public"."ai_models" to "authenticated";

grant update on table "public"."ai_models" to "authenticated";

grant delete on table "public"."ai_models" to "postgres";

grant insert on table "public"."ai_models" to "postgres";

grant references on table "public"."ai_models" to "postgres";

grant select on table "public"."ai_models" to "postgres";

grant trigger on table "public"."ai_models" to "postgres";

grant truncate on table "public"."ai_models" to "postgres";

grant update on table "public"."ai_models" to "postgres";

grant delete on table "public"."ai_models" to "service_role";

grant insert on table "public"."ai_models" to "service_role";

grant references on table "public"."ai_models" to "service_role";

grant select on table "public"."ai_models" to "service_role";

grant trigger on table "public"."ai_models" to "service_role";

grant truncate on table "public"."ai_models" to "service_role";

grant update on table "public"."ai_models" to "service_role";


  create policy "Admins can manage ai models"
  on "public"."ai_models"
  as permissive
  for all
  to public
using (public.authorize('admin'::public.user_role));



  create policy "Users can see all ai models"
  on "public"."ai_models"
  as permissive
  for select
  to public
using (public.authorize('user'::public.user_role));



