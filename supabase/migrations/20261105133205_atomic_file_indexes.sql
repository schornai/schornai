SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.replace_file_index (
  p_repository_id       text,
  p_url                 text,
  p_name                text,
  p_mime_type           text,
  p_keyword             boolean,
  p_embedding_dimension integer,
  p_chunks              jsonb
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
DECLARE
  v_workspace_id text;
  v_source_id text;
  v_chunks jsonb;
  v_prefix text;
BEGIN
  SELECT organization_id INTO v_workspace_id FROM public.databases WHERE id = p_repository_id;
  IF auth.uid() IS NULL OR v_workspace_id IS NULL
    OR NOT public.authorize('editor'::public.user_role, v_workspace_id) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;
  v_prefix := 'database_files/' || v_workspace_id || '/' || p_repository_id || '/';
  IF p_url IS NULL OR left(p_url, length(v_prefix)) <> v_prefix
    OR length(p_url) <= length(v_prefix) OR p_name IS NULL OR p_mime_type IS NULL
    OR p_keyword IS NULL OR p_embedding_dimension IS NULL
    OR p_embedding_dimension NOT IN (0, 384, 768, 1024, 1536)
    OR jsonb_typeof(p_chunks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_FILE_INDEX' USING ERRCODE = '22023';
  END IF;
  IF p_embedding_dimension <> 0 AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_chunks) AS chunk
    WHERE jsonb_typeof(chunk->'embedding') IS DISTINCT FROM 'array'
      OR jsonb_array_length(chunk->'embedding') <> p_embedding_dimension
  ) THEN
    RAISE EXCEPTION 'INVALID_FILE_EMBEDDINGS' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('file_index:' || p_url, 0));
  DELETE FROM public.sources WHERE database_id = p_repository_id AND url = p_url;
  IF NOT p_keyword AND p_embedding_dimension = 0 THEN RETURN; END IF;

  INSERT INTO public.sources (database_id, url, name, mime_type)
  VALUES (p_repository_id, p_url, p_name, p_mime_type) RETURNING id INTO v_source_id;
  SELECT coalesce(jsonb_agg(chunk || jsonb_build_object('id', gen_random_uuid()::text)), '[]'::jsonb)
  INTO v_chunks FROM jsonb_array_elements(p_chunks) AS chunk;

  INSERT INTO public.source_objects (id, source_id, content, page)
  SELECT chunk->>'id', v_source_id, chunk->>'content', (chunk->>'page')::bigint
  FROM jsonb_array_elements(v_chunks) AS chunk;
  IF p_keyword THEN
    INSERT INTO public.text_searches (database_id, object_id, text_search_vector)
    SELECT p_repository_id, chunk->>'id', (chunk->>'searchText')::tsvector
    FROM jsonb_array_elements(v_chunks) AS chunk;
  END IF;
  IF p_embedding_dimension <> 0 THEN
    EXECUTE format(
      'INSERT INTO public.%I (database_id, object_id, embedding)
       SELECT $1, chunk->>''id'', (chunk->''embedding'')::text::extensions.vector
       FROM jsonb_array_elements($2) AS chunk',
      'embeddings_' || p_embedding_dimension
    ) USING p_repository_id, v_chunks;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."replace_file_index"(text, text, text, text, boolean, integer, jsonb) FROM PUBLIC, "anon";

CREATE INDEX embeddings_1024_object_idx ON public.embeddings_1024 USING btree (object_id);

CREATE INDEX embeddings_1536_object_idx ON public.embeddings_1536 USING btree (object_id);

CREATE INDEX embeddings_384_object_idx ON public.embeddings_384 USING btree (object_id);

CREATE INDEX embeddings_768_object_idx ON public.embeddings_768 USING btree (object_id);

CREATE INDEX source_objects_source_idx ON public.source_objects USING btree (source_id);

CREATE INDEX sources_database_url_idx ON public.sources USING btree (database_id, url);

CREATE INDEX text_searches_object_idx ON public.text_searches USING btree (object_id);

COMMENT ON FUNCTION "public"."replace_file_index"(text, text, text, text, boolean, integer, jsonb) IS 'Atomically publish prepared search data; caller must hold the storage file lease. Invoker RLS and editor authorization apply.';

GRANT EXECUTE ON FUNCTION "public"."replace_file_index"(text, text, text, text, boolean, integer, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."replace_file_index"(text, text, text, text, boolean, integer, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."replace_file_index"(text, text, text, text, boolean, integer, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."replace_file_index"(text, text, text, text, boolean, integer, jsonb) TO "service_role";

