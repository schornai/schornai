

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






-- Legacy PG15 installations may provide pgjwt; Cloud PG17 no longer does.
-- The application uses Supabase Auth for JWTs and has no dependency on pgjwt.
-- This bootstrap guard permits fresh installs without changing existing databases.
DO $bootstrap$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_available_extensions WHERE name = 'pgjwt') THEN
    CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
  END IF;
END;
$bootstrap$;






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."chatbot_endpoint_visibility" AS ENUM (
    'draft',
    'internal',
    'public'
);


ALTER TYPE "public"."chatbot_endpoint_visibility" OWNER TO "postgres";


CREATE TYPE "public"."chatbot_visibility" AS ENUM (
    'public',
    'users',
    'editors'
);


ALTER TYPE "public"."chatbot_visibility" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'editor',
    'user'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize"("p_role" "public"."user_role") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare
  has_role boolean;
begin
  select exists (
    select 1
    from jsonb_array_elements(auth.jwt() -> 'organization_roles') as org_role
    where (
           (p_role = 'user' and org_role ->> 'role' in ('user', 'editor', 'admin'))
        or (p_role = 'editor' and org_role ->> 'role' in ('editor', 'admin'))
        or (p_role = 'admin' and org_role ->> 'role' = 'admin')
      )
  )
  into has_role;
  
  return has_role;
end;$$;


ALTER FUNCTION "public"."authorize"("p_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize"("p_role" "public"."user_role", "p_organization_id" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$declare
  has_role boolean;
begin
  select exists (
    select 1
    from jsonb_array_elements(auth.jwt() -> 'organization_roles') as org_role
    where org_role ->> 'organization_id' = p_organization_id
      and (
           (p_role = 'user' and org_role ->> 'role' in ('user', 'editor', 'admin'))
        or (p_role = 'editor' and org_role ->> 'role' in ('editor', 'admin'))
        or (p_role = 'admin' and org_role ->> 'role' = 'admin')
      )
  )
  into has_role;
  
  return has_role;
end;$$;


ALTER FUNCTION "public"."authorize"("p_role" "public"."user_role", "p_organization_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access"("user_id" "uuid", "owner_id" "uuid", "user_role" "text", "minimum_role" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Prüfen, ob der Benutzer der Besitzer ist (NULL-Safe)
    IF user_id IS NOT NULL AND owner_id IS NOT NULL AND user_id = owner_id THEN
        RETURN TRUE;
    END IF;

    -- Prüfen, ob die Rolle die Mindestanforderungen erfüllt
    IF user_role IS NOT NULL THEN
        RETURN CASE minimum_role
            WHEN 'user' THEN user_role IN ('user', 'editor', 'admin')
            WHEN 'editor' THEN user_role IN ('editor', 'admin')
            WHEN 'admin' THEN user_role = 'admin'
            ELSE FALSE -- Für ungültige Mindestrollen
        END;
    END IF;

    -- Falls keine der Bedingungen erfüllt ist, Zugriff verweigern
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_access"("user_id" "uuid", "owner_id" "uuid", "user_role" "text", "minimum_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_endpoint"("user_role" "text", "visibility" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Admins und Editor können alles sehen
    IF user_role IN ('editor', 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Benutzer können nur 'internal' und 'public' sehen
    IF user_role = 'user' THEN
        RETURN visibility IN ('internal', 'public');
    END IF;

    -- Fallback: Kein Zugriff für andere Rollen oder ungültige Werte
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_view_endpoint"("user_role" "text", "visibility" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$declare
    claims jsonb;
    organization_roles jsonb;
  begin
    select 
      coalesce(jsonb_agg(jsonb_build_object('role', ROLE, 'organization_id', organization_id))::jsonb, '[]'::jsonb)
      into organization_roles
    from 
      public.user_roles 
    where 
      user_id = (event->>'user_id')::uuid;

    claims := event->'claims';

    claims := jsonb_set(claims, '{organization_roles}', to_jsonb(organization_roles));

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    -- Return the modified or original event
    return event;
  end;$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_custom_id"() RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$DECLARE
    base36_chars TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
    result TEXT := '';
    random_bytes BYTEA;
    random_index INT;
BEGIN
    -- Generate random bytes
    random_bytes := extensions.gen_random_bytes(25);  -- 25 bytes for 25 characters in base36
    
    -- Convert random bytes to base36 characters (lowercase letters and numbers)
    FOR i IN 0..24 LOOP
        random_index := get_byte(random_bytes, i) % 36 + 1;
        result := result || SUBSTRING(base36_chars FROM random_index FOR 1);
    END LOOP;
    
    RETURN result;
END;$$;


ALTER FUNCTION "public"."generate_custom_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."source_folders" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_folder_id" "text",
    "database_id" "text" NOT NULL
);


ALTER TABLE "public"."source_folders" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_parent_folders"("folder_id" "text") RETURNS SETOF "public"."source_folders"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_hierarchy AS (
        SELECT *
        FROM public.source_folders
        WHERE id = folder_id  -- Use the provided folder_id parameter

        UNION ALL

        SELECT sf.*
        FROM public.source_folders sf
        INNER JOIN folder_hierarchy fh ON sf.id = fh.parent_folder_id
    )
    SELECT * FROM folder_hierarchy;
END;
$$;


ALTER FUNCTION "public"."get_parent_folders"("folder_id" "text") OWNER TO "postgres";

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Create the profile for this user
  insert into public.user_profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );

  -- Bootstrap: if user_roles is empty, make this user the first admin.
  -- Lock to avoid a race where two concurrent signups both see the table as empty.
  lock table public.user_roles in exclusive mode;

  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin');
  end if;

  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


CREATE OR REPLACE FUNCTION "public"."match_embeddings_1024"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1024" "public"."vector") RETURNS SETOF "record"
    LANGUAGE "sql"
    AS $$
  select 
    e.object_id,
    e.embedding <#> query_embedding_1024 as product
  from embeddings_1024 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> query_embedding_1024 < -match_threshold
  order by e.embedding <#> query_embedding_1024 asc
  limit match_count;$$;


ALTER FUNCTION "public"."match_embeddings_1024"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1024" "public"."vector") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_embeddings_1536"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1536" "public"."vector") RETURNS SETOF "record"
    LANGUAGE "sql"
    AS $$
  select 
    e.object_id,
    e.embedding <#> query_embedding_1536 as product
  from embeddings_1536 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> query_embedding_1536 < -match_threshold
  order by e.embedding <#> query_embedding_1536 asc
  limit match_count;$$;


ALTER FUNCTION "public"."match_embeddings_1536"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1536" "public"."vector") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_embeddings_384"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_384" "public"."vector") RETURNS SETOF "record"
    LANGUAGE "sql"
    AS $$
  select 
    e.object_id,
    e.embedding <#> query_embedding_384 as product
  from embeddings_384 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> query_embedding_384 < -match_threshold
  order by e.embedding <#> query_embedding_384 asc
  limit match_count;$$;


ALTER FUNCTION "public"."match_embeddings_384"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_384" "public"."vector") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_embeddings_768"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_768" "public"."vector") RETURNS SETOF "record"
    LANGUAGE "sql"
    AS $$
  select 
    e.object_id,
    e.embedding <#> query_embedding_768 as product
  from embeddings_768 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> query_embedding_768 < -match_threshold
  order by e.embedding <#> query_embedding_768 asc
  limit match_count;$$;


ALTER FUNCTION "public"."match_embeddings_768"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_768" "public"."vector") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."supabase_url"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  secret_value text;
begin
  select decrypted_secret into secret_value from vault.decrypted_secrets where name = 'supabase_url';
  return secret_value;
end;
$$;


ALTER FUNCTION "public"."supabase_url"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update__text_searches__text_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.text_search_vector := to_tsvector('german', NEW.text_search_vector::TEXT);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update__text_searches__text_search_vector"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_states" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "messages" "jsonb" NOT NULL,
    "chat_id" "text" NOT NULL
);


ALTER TABLE "public"."chat_states" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chatbot_favorites" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "chatbot_id" "text" NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "public"."chatbot_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chatbots" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "organization_id" "text" NOT NULL,
    "visibility" "public"."chatbot_visibility" DEFAULT 'editors'::"public"."chatbot_visibility" NOT NULL,
    "config" "jsonb" NOT NULL,
    "roles" "jsonb" NOT NULL
);


ALTER TABLE "public"."chatbots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "label" "text" NOT NULL,
    "user_id" "uuid",
    "chatbot_id" "text"
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."databases" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "config" "jsonb" NOT NULL,
    "organization_id" "text",
    "user_id" "uuid"
);


ALTER TABLE "public"."databases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embeddings_1024" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "embedding" "public"."vector"(1024),
    "object_id" "text" NOT NULL,
    "database_id" "text" NOT NULL
);


ALTER TABLE "public"."embeddings_1024" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embeddings_1536" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "embedding" "public"."vector"(1536),
    "object_id" "text" NOT NULL,
    "database_id" "text" NOT NULL
);


ALTER TABLE "public"."embeddings_1536" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embeddings_384" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "embedding" "public"."vector"(384),
    "object_id" "text" NOT NULL,
    "database_id" "text" NOT NULL
);


ALTER TABLE "public"."embeddings_384" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embeddings_768" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "embedding" "public"."vector"(768),
    "object_id" "text" NOT NULL,
    "database_id" "text" NOT NULL
);


ALTER TABLE "public"."embeddings_768" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ollama_models" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "identifier" "text" NOT NULL,
    "feature_embedding" boolean DEFAULT false NOT NULL,
    "feature_vision" boolean DEFAULT false NOT NULL,
    "feature_tools" boolean DEFAULT false NOT NULL,
    "context_size" numeric DEFAULT '2048'::numeric NOT NULL,
    "image" "jsonb",
    "embedding_vector_size" integer
);


ALTER TABLE "public"."ollama_models" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."source_objects" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text" NOT NULL,
    "page" bigint,
    "source_id" "text" NOT NULL
);


ALTER TABLE "public"."source_objects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sources" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "url" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "database_id" "text" NOT NULL,
    "source_folder_id" "text",
    "name" "text" NOT NULL
);


ALTER TABLE "public"."sources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."text_searches" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "text_search_vector" "tsvector" NOT NULL,
    "object_id" "text" NOT NULL,
    "database_id" "text" NOT NULL
);


ALTER TABLE "public"."text_searches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "first_name" character varying,
    "last_name" character varying,
    "avatar_url" character varying
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "text" DEFAULT "public"."generate_custom_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "public"."user_role" DEFAULT 'user'::"public"."user_role" NOT NULL, 
    "user_id" "uuid" NOT NULL,
    "organization_id" "text"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chat_states"
    ADD CONSTRAINT "chat_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_favorites"
    ADD CONSTRAINT "chatbot_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."databases"
    ADD CONSTRAINT "databases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embeddings_1024"
    ADD CONSTRAINT "embeddings_1024_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embeddings_1536"
    ADD CONSTRAINT "embeddings_1536_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embeddings_384"
    ADD CONSTRAINT "embeddings_384_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embeddings_768"
    ADD CONSTRAINT "embeddings_768_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ollama_models"
    ADD CONSTRAINT "ollama_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organization_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."source_folders"
    ADD CONSTRAINT "source_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."source_objects"
    ADD CONSTRAINT "source_objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sources"
    ADD CONSTRAINT "sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."text_searches"
    ADD CONSTRAINT "text_searches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chatbot_favorites"
    ADD CONSTRAINT "unique_user_chatbot" UNIQUE ("user_id", "chatbot_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



CREATE INDEX "embeddings_1024_hnsw_idx" ON "public"."embeddings_1024" USING "hnsw" ("embedding" "public"."vector_ip_ops");



CREATE INDEX "embeddings_1536_hnsw_idx" ON "public"."embeddings_1536" USING "hnsw" ("embedding" "public"."vector_ip_ops");



CREATE INDEX "embeddings_384_hnsw_idx" ON "public"."embeddings_384" USING "hnsw" ("embedding" "public"."vector_ip_ops");



CREATE INDEX "embeddings_768_hnsw_idx" ON "public"."embeddings_768" USING "hnsw" ("embedding" "public"."vector_ip_ops");



CREATE INDEX "text_searches_idx" ON "public"."text_searches" USING "gin" ("text_search_vector");



CREATE OR REPLACE TRIGGER "text_searches__text_search_vector" BEFORE INSERT OR UPDATE ON "public"."text_searches" FOR EACH ROW EXECUTE FUNCTION "public"."update__text_searches__text_search_vector"();



ALTER TABLE ONLY "public"."chat_states"
    ADD CONSTRAINT "chat_states_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_favorites"
    ADD CONSTRAINT "chatbot_favorites_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbot_favorites"
    ADD CONSTRAINT "chatbot_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."databases"
    ADD CONSTRAINT "databases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."databases"
    ADD CONSTRAINT "databases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_1024"
    ADD CONSTRAINT "embeddings_1024_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_1024"
    ADD CONSTRAINT "embeddings_1024_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "public"."source_objects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_1536"
    ADD CONSTRAINT "embeddings_1536_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_1536"
    ADD CONSTRAINT "embeddings_1536_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "public"."source_objects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_384"
    ADD CONSTRAINT "embeddings_384_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_384"
    ADD CONSTRAINT "embeddings_384_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "public"."source_objects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_768"
    ADD CONSTRAINT "embeddings_768_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings_768"
    ADD CONSTRAINT "embeddings_768_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "public"."source_objects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "public_user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "public_user_roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "public_user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."source_folders"
    ADD CONSTRAINT "source_folders_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."source_folders"
    ADD CONSTRAINT "source_folders_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."source_folders"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."source_objects"
    ADD CONSTRAINT "source_objects_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sources"
    ADD CONSTRAINT "sources_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_searches"
    ADD CONSTRAINT "text_searches_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."databases"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."text_searches"
    ADD CONSTRAINT "text_searches_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "public"."source_objects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Allow admins to manage models" ON "public"."ollama_models" USING ("public"."authorize"('admin'::"public"."user_role"));



CREATE POLICY "Allow admins to manage system settings" ON "public"."system_settings" USING ("public"."authorize"('admin'::"public"."user_role"));





CREATE POLICY "Allow editors to create new chatbots" ON "public"."chatbots" FOR INSERT WITH CHECK ("public"."authorize"('editor'::"public"."user_role", "organization_id"));



CREATE POLICY "Allow editors to create, update, delete databases" ON "public"."databases" USING ("public"."authorize"('editor'::"public"."user_role", "organization_id")) WITH CHECK ("public"."authorize"('editor'::"public"."user_role", "organization_id"));



CREATE POLICY "Allow editors to delete chatbots" ON "public"."chatbots" FOR DELETE USING ("public"."authorize"('editor'::"public"."user_role", "organization_id"));



CREATE POLICY "Allow editors to edit chatbots" ON "public"."chatbots" FOR UPDATE USING ("public"."authorize"('editor'::"public"."user_role", "organization_id"));



CREATE POLICY "Allow editors to manage embeddings_1024" ON "public"."embeddings_1024" USING (("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_1024"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_1024"."database_id"))) AS "exists")));



CREATE POLICY "Allow editors to manage embeddings_1536" ON "public"."embeddings_1536" USING (("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_1536"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_1536"."database_id"))) AS "exists")));



CREATE POLICY "Allow editors to manage embeddings_384" ON "public"."embeddings_384" USING (("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_384"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_384"."database_id"))) AS "exists")));



CREATE POLICY "Allow editors to manage embeddings_768" ON "public"."embeddings_768" USING (("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_768"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_768"."database_id"))) AS "exists")));



CREATE POLICY "Allow editors to manage source folders" ON "public"."source_folders" USING ("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM "public"."databases"
  WHERE ("databases"."id" = "source_folders"."database_id")))) WITH CHECK ("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM "public"."databases"
  WHERE ("databases"."id" = "source_folders"."database_id"))));



CREATE POLICY "Allow editors to manage source_objects" ON "public"."source_objects" USING ("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM ("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
  WHERE ("sources"."id" = "source_objects"."source_id"))));



CREATE POLICY "Allow editors to manage sources" ON "public"."sources" USING ("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM "public"."databases"
  WHERE ("databases"."id" = "sources"."database_id")))) WITH CHECK ("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM "public"."databases"
  WHERE ("databases"."id" = "sources"."database_id"))));



CREATE POLICY "Allow editors to manage text_searches" ON "public"."text_searches" USING (("public"."authorize"('editor'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "text_searches"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "text_searches"."database_id"))) AS "exists")));



CREATE POLICY "Allow to get own organizations" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "user_roles"."organization_id"
   FROM "public"."user_roles")));



CREATE POLICY "Allow to get own roles" ON "public"."user_roles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow to manage own favorites" ON "public"."chatbot_favorites" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow users to delete their own profile" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Allow users to get chatbots" ON "public"."chatbots" FOR SELECT USING ("public"."authorize"('user'::"public"."user_role", "organization_id"));



CREATE POLICY "Allow users to get databases" ON "public"."databases" FOR SELECT USING ("public"."authorize"('user'::"public"."user_role", "organization_id"));



CREATE POLICY "Allow users to get models" ON "public"."ollama_models" FOR SELECT USING ("public"."authorize"('user'::"public"."user_role"));



CREATE POLICY "Allow users to insert their own profile" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Allow users to manage their own chat states (by chat visibility" ON "public"."chat_states" USING ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE ("chats"."id" = "chat_states"."chat_id")))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE ("chats"."id" = "chat_states"."chat_id"))));



CREATE POLICY "Allow users to read system settings" ON "public"."system_settings" FOR SELECT USING ("public"."authorize"('user'::"public"."user_role"));



CREATE POLICY "Allow users to see embeddings_1024" ON "public"."embeddings_1024" FOR SELECT USING (("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_1024"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_1024"."database_id"))) AS "exists")));



CREATE POLICY "Allow users to see embeddings_1536" ON "public"."embeddings_1536" FOR SELECT USING (("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_1536"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_1536"."database_id"))) AS "exists")));



CREATE POLICY "Allow users to see embeddings_384" ON "public"."embeddings_384" FOR SELECT USING (("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_384"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_384"."database_id"))) AS "exists")));



CREATE POLICY "Allow users to see embeddings_768" ON "public"."embeddings_768" FOR SELECT USING (("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "embeddings_768"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "embeddings_768"."database_id"))) AS "exists")));



CREATE POLICY "Allow users to see source_folders" ON "public"."source_folders" FOR SELECT USING ("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM "public"."databases"
  WHERE ("databases"."id" = "source_folders"."database_id"))));



CREATE POLICY "Allow users to see source_objects" ON "public"."source_objects" FOR SELECT USING ("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM ("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
  WHERE ("sources"."id" = "source_objects"."source_id"))));



CREATE POLICY "Allow users to see sources" ON "public"."sources" FOR SELECT USING ("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM "public"."databases"
  WHERE ("databases"."id" = "sources"."database_id"))));



CREATE POLICY "Allow users to see text_searches" ON "public"."text_searches" FOR SELECT USING (("public"."authorize"('user'::"public"."user_role", ( SELECT "databases"."organization_id"
   FROM (("public"."databases"
     JOIN "public"."sources" ON (("sources"."database_id" = "databases"."id")))
     JOIN "public"."source_objects" ON (("source_objects"."source_id" = "sources"."id")))
  WHERE ("source_objects"."id" = "text_searches"."object_id"))) AND ( SELECT (EXISTS ( SELECT 1
           FROM "public"."databases"
          WHERE ("databases"."id" = "text_searches"."database_id"))) AS "exists")));



CREATE POLICY "Allow users to select their own profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Allow users to update their own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can manage their own chats" ON "public"."chats" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."chat_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbot_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chatbots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."databases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embeddings_1024" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embeddings_1536" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embeddings_384" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embeddings_768" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ollama_models" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."source_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."source_objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."text_searches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."authorize"("p_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."authorize"("p_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize"("p_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."authorize"("p_role" "public"."user_role", "p_organization_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authorize"("p_role" "public"."user_role", "p_organization_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize"("p_role" "public"."user_role", "p_organization_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access"("user_id" "uuid", "owner_id" "uuid", "user_role" "text", "minimum_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access"("user_id" "uuid", "owner_id" "uuid", "user_role" "text", "minimum_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access"("user_id" "uuid", "owner_id" "uuid", "user_role" "text", "minimum_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_endpoint"("user_role" "text", "visibility" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_endpoint"("user_role" "text", "visibility" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_endpoint"("user_role" "text", "visibility" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_custom_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_custom_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_custom_id"() TO "service_role";



GRANT ALL ON TABLE "public"."source_folders" TO "anon";
GRANT ALL ON TABLE "public"."source_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."source_folders" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_parent_folders"("folder_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_parent_folders"("folder_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_parent_folders"("folder_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embeddings_1024"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1024" "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."match_embeddings_1024"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1024" "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embeddings_1024"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1024" "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embeddings_1536"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1536" "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."match_embeddings_1536"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1536" "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embeddings_1536"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_1536" "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embeddings_384"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_384" "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."match_embeddings_384"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_384" "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embeddings_384"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_384" "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_embeddings_768"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_768" "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."match_embeddings_768"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_768" "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_embeddings_768"("param_database_id" "text", "match_threshold" double precision, "match_count" integer, "query_embedding_768" "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."supabase_url"() TO "anon";
GRANT ALL ON FUNCTION "public"."supabase_url"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."supabase_url"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update__text_searches__text_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update__text_searches__text_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update__text_searches__text_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."chat_states" TO "anon";
GRANT ALL ON TABLE "public"."chat_states" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_states" TO "service_role";



GRANT ALL ON TABLE "public"."chatbot_favorites" TO "anon";
GRANT ALL ON TABLE "public"."chatbot_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbot_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."chatbots" TO "anon";
GRANT ALL ON TABLE "public"."chatbots" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbots" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."databases" TO "anon";
GRANT ALL ON TABLE "public"."databases" TO "authenticated";
GRANT ALL ON TABLE "public"."databases" TO "service_role";



GRANT ALL ON TABLE "public"."embeddings_1024" TO "anon";
GRANT ALL ON TABLE "public"."embeddings_1024" TO "authenticated";
GRANT ALL ON TABLE "public"."embeddings_1024" TO "service_role";



GRANT ALL ON TABLE "public"."embeddings_1536" TO "anon";
GRANT ALL ON TABLE "public"."embeddings_1536" TO "authenticated";
GRANT ALL ON TABLE "public"."embeddings_1536" TO "service_role";



GRANT ALL ON TABLE "public"."embeddings_384" TO "anon";
GRANT ALL ON TABLE "public"."embeddings_384" TO "authenticated";
GRANT ALL ON TABLE "public"."embeddings_384" TO "service_role";



GRANT ALL ON TABLE "public"."embeddings_768" TO "anon";
GRANT ALL ON TABLE "public"."embeddings_768" TO "authenticated";
GRANT ALL ON TABLE "public"."embeddings_768" TO "service_role";



GRANT ALL ON TABLE "public"."ollama_models" TO "anon";
GRANT ALL ON TABLE "public"."ollama_models" TO "authenticated";
GRANT ALL ON TABLE "public"."ollama_models" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."source_objects" TO "anon";
GRANT ALL ON TABLE "public"."source_objects" TO "authenticated";
GRANT ALL ON TABLE "public"."source_objects" TO "service_role";



GRANT ALL ON TABLE "public"."sources" TO "anon";
GRANT ALL ON TABLE "public"."sources" TO "authenticated";
GRANT ALL ON TABLE "public"."sources" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."text_searches" TO "anon";
GRANT ALL ON TABLE "public"."text_searches" TO "authenticated";
GRANT ALL ON TABLE "public"."text_searches" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";
GRANT ALL ON TABLE "public"."user_roles" TO "supabase_auth_admin";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;


INSERT INTO storage.buckets (id, name, public) VALUES ('chatbot_images', 'chatbot_images', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('model_images', 'model_images', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('user_avatars', 'user_avatars', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('database_files', 'database_files', false);

--
-- Dumped schema changes for auth and storage
--

CREATE POLICY "Download only from organization folders ruowxf_3" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'database_files'::"text") AND "public"."authorize"('user'::"public"."user_role", ("storage"."foldername"("name"))[1])));



CREATE POLICY "Give users access to own folder eq7zk6_0" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'user_avatars'::"text") AND (( SELECT ("auth"."uid"())::"text" AS "uid") = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Give users access to own folder eq7zk6_1" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'user_avatars'::"text") AND (( SELECT ("auth"."uid"())::"text" AS "uid") = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Give users access to own folder eq7zk6_2" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'user_avatars'::"text") AND (( SELECT ("auth"."uid"())::"text" AS "uid") = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Upload only as admin 1ue1qvi_0" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'model_images'::"text") AND "public"."authorize"('admin'::"public"."user_role")));



CREATE POLICY "Upload only as admin 1ue1qvi_1" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'model_images'::"text") AND "public"."authorize"('admin'::"public"."user_role")));



CREATE POLICY "Upload only as admin 1ue1qvi_2" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'model_images'::"text") AND "public"."authorize"('admin'::"public"."user_role")));



CREATE POLICY "Upload only as admin 1ue1qvi_3" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'model_images'::"text") AND "public"."authorize"('admin'::"public"."user_role")));



CREATE POLICY "Upload only to organization folders 1on0w20_0" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'chatbot_images'::"text") AND "public"."authorize"('editor'::"public"."user_role", ("storage"."foldername"("name"))[1])));



CREATE POLICY "Upload/edit/delete only to organization folders ruowxf_0" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'database_files'::"text") AND "public"."authorize"('editor'::"public"."user_role", ("storage"."foldername"("name"))[1])));



CREATE POLICY "Upload/edit/delete only to organization folders ruowxf_1" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'database_files'::"text") AND "public"."authorize"('editor'::"public"."user_role", ("storage"."foldername"("name"))[1])));



CREATE POLICY "Upload/edit/delete only to organization folders ruowxf_2" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'database_files'::"text") AND "public"."authorize"('editor'::"public"."user_role", ("storage"."foldername"("name"))[1])));



CREATE POLICY "User can see chatbot images 1on0w20_0" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'chatbot_images'::"text") AND "public"."authorize"('user'::"public"."user_role", ("storage"."foldername"("name"))[1])));



ALTER PUBLICATION supabase_realtime ADD TABLE chats;


create policy "Allow admins to manage organizations"
on "public"."organizations"
as permissive
for all
to public
using (authorize('admin'::user_role));


create policy "Allow admins to manage user roles"
on "public"."user_roles"
as permissive
for all
to public
using (authorize('admin'::user_role));
