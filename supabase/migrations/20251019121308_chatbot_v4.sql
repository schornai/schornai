DO $$
BEGIN
    -- Only add the constraint if it does NOT exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sources_source_folder_id_fkey'
    ) THEN
        ALTER TABLE public.sources
        ADD CONSTRAINT sources_source_folder_id_fkey
            FOREIGN KEY (source_folder_id)
            REFERENCES source_folders(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
            NOT VALID;

        ALTER TABLE public.sources
        VALIDATE CONSTRAINT sources_source_folder_id_fkey;
    END IF;
END$$;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.match_embeddings_1024_v2(param_database_id text, param_threshold double precision, param_offset integer, param_limit integer, param_embedding vector)
 RETURNS SETOF record
 LANGUAGE sql
AS $function$
  select 
    e.object_id,
    e.embedding <#> param_embedding as product
  from embeddings_1024 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> param_embedding < -param_threshold
  order by e.embedding <#> param_embedding asc
  offset param_offset
  limit param_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.match_embeddings_1536_v2(param_database_id text, param_threshold double precision, param_offset integer, param_limit integer, param_embedding vector)
 RETURNS SETOF record
 LANGUAGE sql
AS $function$
  select 
    e.object_id,
    e.embedding <#> param_embedding as product
  from embeddings_1536 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> param_embedding < -param_threshold
  order by e.embedding <#> param_embedding asc
  offset param_offset
  limit param_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.match_embeddings_384_v2(param_database_id text, param_threshold double precision, param_offset integer, param_limit integer, param_embedding vector)
 RETURNS SETOF record
 LANGUAGE sql
AS $function$
  select 
    e.object_id,
    e.embedding <#> param_embedding as product
  from embeddings_384 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> param_embedding < -param_threshold
  order by e.embedding <#> param_embedding asc
  offset param_offset
  limit param_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.match_embeddings_768_v2(param_database_id text, param_threshold double precision, param_offset integer, param_limit integer, param_embedding vector)
 RETURNS SETOF record
 LANGUAGE sql
AS $function$
  select 
    e.object_id,
    e.embedding <#> param_embedding as product
  from embeddings_768 e
  where 
    e.database_id = param_database_id and
    e.embedding <#> param_embedding < -param_threshold
  order by e.embedding <#> param_embedding asc
  offset param_offset
  limit param_limit;
$function$
;

create or replace view "public"."text_searches_with_sources" as  SELECT ts.id,
    ts.created_at,
    ts.text_search_vector,
    ts.object_id,
    ts.database_id,
    so.source_id
   FROM (text_searches ts
     JOIN source_objects so ON ((so.id = ts.object_id)));




