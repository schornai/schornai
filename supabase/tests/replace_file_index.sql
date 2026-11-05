-- Run against a migrated disposable database; fixtures and failure triggers roll back.
BEGIN;
INSERT INTO public.organizations (id, name, description)
VALUES ('index-test-own', 'Index test', ''), ('index-test-other', 'Other', '');
INSERT INTO public.databases (id, name, description, organization_id, config)
VALUES ('index-test-repo', 'Index test', '', 'index-test-own', '{}'),
       ('index-test-foreign', 'Other', '', 'index-test-other', '{}');

CREATE FUNCTION public.test_fail_index_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.source_objects WHERE id = NEW.object_id AND content = 'fail-publication') THEN
    RAISE EXCEPTION 'Simulated publication failure';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER test_fail_index_insert BEFORE INSERT ON public.text_searches
FOR EACH ROW EXECUTE FUNCTION public.test_fail_index_insert();

DO $test$
BEGIN
  IF has_function_privilege('anon', 'public.replace_file_index(text,text,text,text,boolean,integer,jsonb)', 'execute') THEN
    RAISE EXCEPTION 'Anonymous index publication allowed';
  END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a1b00000-0000-4000-8000-000000000001","organization_roles":[{"organization_id":"index-test-own","role":"editor"}]}', true);
DO $test$
DECLARE
  v_url text := 'database_files/index-test-own/index-test-repo/file.txt';
  v_original text;
  v_dimension integer;
  v_vector jsonb;
  v_count integer;
BEGIN
  PERFORM public.replace_file_index('index-test-repo', v_url, 'file.txt', 'text/plain', true, 0,
    '[{"content":"original","page":0,"searchText":"original"}]');
  SELECT id INTO STRICT v_original FROM public.sources WHERE url = v_url;
  BEGIN
    PERFORM public.replace_file_index('index-test-repo', v_url, 'file.txt', 'text/plain', true, 0,
      '[{"content":"new first chunk","page":0,"searchText":"new"},{"content":"fail-publication","page":400,"searchText":"failure"}]');
    RAISE EXCEPTION 'Expected publication failure was not raised';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Simulated publication failure' THEN RAISE; END IF;
  END;
  IF (SELECT id FROM public.sources WHERE url = v_url) IS DISTINCT FROM v_original
    OR (SELECT content FROM public.source_objects WHERE source_id = v_original) <> 'original'
    OR (SELECT count(*) FROM public.text_searches WHERE database_id = 'index-test-repo') <> 1 THEN
    RAISE EXCEPTION 'Failed publication changed the old index';
  END IF;

  FOREACH v_dimension IN ARRAY ARRAY[384,768,1024,1536] LOOP
    SELECT jsonb_agg(0.1) INTO v_vector FROM generate_series(1, v_dimension);
    PERFORM public.replace_file_index('index-test-repo', v_url, 'file.txt', 'text/plain', true, v_dimension,
      jsonb_build_array(jsonb_build_object('content', 'replacement', 'page', 400, 'searchText', 'replacement', 'embedding', v_vector)));
    IF (SELECT count(*) FROM public.sources WHERE url = v_url) <> 1
      OR (SELECT count(*) FROM public.source_objects o JOIN public.sources s ON s.id = o.source_id WHERE s.url = v_url AND o.content = 'replacement' AND o.page = 400) <> 1
      OR (SELECT count(*) FROM public.text_searches WHERE database_id = 'index-test-repo') <> 1 THEN
      RAISE EXCEPTION 'Incomplete replacement for dimension %', v_dimension;
    END IF;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE database_id = $1', 'embeddings_' || v_dimension)
      INTO v_count USING 'index-test-repo';
    IF v_count <> 1 THEN RAISE EXCEPTION 'Missing vectors for dimension %', v_dimension; END IF;
  END LOOP;

  SELECT id INTO STRICT v_original FROM public.sources WHERE url = v_url;
  BEGIN
    PERFORM public.replace_file_index('index-test-repo', v_url, 'file.txt', 'text/plain', true, 1536,
      '[{"content":"bad vector","page":0,"searchText":"bad","embedding":[1,2]}]');
    RAISE EXCEPTION 'Invalid vector accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT id FROM public.sources WHERE url = v_url) IS DISTINCT FROM v_original THEN
    RAISE EXCEPTION 'Invalid vectors changed the old source';
  END IF;
  BEGIN
    PERFORM public.replace_file_index('index-test-foreign', 'database_files/index-test-other/index-test-foreign/file.txt', 'file.txt', 'text/plain', false, 0, '[]');
    RAISE EXCEPTION 'Foreign repository mutation allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.replace_file_index('index-test-repo', 'database_files/index-test-other/index-test-foreign/file.txt', 'file.txt', 'text/plain', false, 0, '[]');
    RAISE EXCEPTION 'Foreign file URL accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  PERFORM set_config('request.jwt.claims', '{"sub":"a1b00000-0000-4000-8000-000000000001","organization_roles":[{"organization_id":"index-test-own","role":"user"}]}', true);
  BEGIN
    PERFORM public.replace_file_index('index-test-repo', v_url, 'file.txt', 'text/plain', false, 0, '[]');
    RAISE EXCEPTION 'Reader could remove an index';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT id FROM public.sources WHERE url = v_url) IS DISTINCT FROM v_original THEN
    RAISE EXCEPTION 'Reader changed the old source';
  END IF;
  PERFORM set_config('request.jwt.claims', '{"sub":"a1b00000-0000-4000-8000-000000000001","organization_roles":[{"organization_id":"index-test-own","role":"editor"}]}', true);
  PERFORM public.replace_file_index('index-test-repo', v_url, 'file.txt', 'text/plain', false, 0, '[]');
  IF EXISTS (SELECT 1 FROM public.sources WHERE url = v_url)
    OR EXISTS (SELECT 1 FROM public.text_searches WHERE database_id = 'index-test-repo') THEN
    RAISE EXCEPTION 'Disabled index retained search data';
  END IF;
  FOREACH v_dimension IN ARRAY ARRAY[384,768,1024,1536] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE database_id = $1', 'embeddings_' || v_dimension)
      INTO v_count USING 'index-test-repo';
    IF v_count <> 0 THEN RAISE EXCEPTION 'Obsolete vectors retained'; END IF;
  END LOOP;
END;
$test$;
RESET ROLE;
ROLLBACK;
