-- Run against a migrated disposable database. All test data and triggers roll back.
BEGIN;
DO $test$
BEGIN
  IF has_table_privilege('anon', 'public.ai_model_credentials', 'SELECT')
     OR has_table_privilege('authenticated', 'public.ai_model_credentials', 'SELECT') THEN
    RAISE EXCEPTION 'Model credentials are exposed';
  END IF;
  IF has_function_privilege('anon', 'public.create_external_ai_model(text,text,text,text,text,text,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.create_external_ai_model(text,text,text,text,text,text,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.update_external_ai_model(text,text,text,text,text,text,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.update_external_ai_model(text,text,text,text,text,text,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Model mutation RPC is exposed';
  END IF;
END $test$;

CREATE FUNCTION public.test_reject_external_model_key() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $function$
BEGIN
  IF NEW.api_key = 'force-credential-failure' THEN
    RAISE EXCEPTION 'Simulated credential storage failure';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER test_reject_external_model_key
BEFORE INSERT OR UPDATE ON public.ai_model_credentials
FOR EACH ROW EXECUTE FUNCTION public.test_reject_external_model_key();

SET LOCAL ROLE service_role;
DO $test$
DECLARE
  test_model_id text;
  original_config jsonb;
  before_count bigint;
BEGIN
  SELECT count(*) INTO before_count FROM public.ai_models;
  BEGIN
    PERFORM public.create_external_ai_model('Failed model', 'chat-test',
      'https://api.example.com/v1', 'force-credential-failure');
    RAISE EXCEPTION 'Expected credential storage failure was not raised';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Simulated credential storage failure' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.ai_models) <> before_count THEN
    RAISE EXCEPTION 'Failed creation left orphaned metadata';
  END IF;

  test_model_id := public.create_external_ai_model('Regression model', 'chat-test',
    'https://api.example.com/v1', 'regression-secret');
  SELECT config INTO original_config FROM public.ai_models WHERE id = test_model_id;
  IF original_config->>'modelId' <> 'chat-test' OR original_config::text LIKE '%regression-secret%' THEN
    RAISE EXCEPTION 'Incorrect or secret-bearing public model configuration';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ai_model_credentials WHERE model_id = test_model_id AND api_key = 'regression-secret') THEN
    RAISE EXCEPTION 'Credential was not saved';
  END IF;

  BEGIN
    PERFORM public.update_external_ai_model(test_model_id, 'changed',
      'https://other.example.com/v1', 'force-credential-failure', 'openai-compatible');
    RAISE EXCEPTION 'Expected update failure was not raised';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Simulated credential storage failure' THEN RAISE; END IF;
  END;
  IF (SELECT config FROM public.ai_models WHERE id = test_model_id) IS DISTINCT FROM original_config
    OR (SELECT api_key FROM public.ai_model_credentials WHERE model_id = test_model_id) <> 'regression-secret' THEN
    RAISE EXCEPTION 'Failed update changed the connection or credential';
  END IF;

  BEGIN
    PERFORM public.update_external_ai_model(test_model_id, 'changed',
      'https://other.example.com/v1', 'replacement-secret', 'openai');
    RAISE EXCEPTION 'Provider change was not rejected';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  PERFORM public.update_external_ai_model(test_model_id, 'changed',
    'https://other.example.com/v1', 'replacement-secret', 'openai-compatible');
  IF NOT EXISTS (
    SELECT 1 FROM public.ai_models m JOIN public.ai_model_credentials c ON c.model_id = m.id
    WHERE m.id = test_model_id AND m.config->>'baseUrl' = 'https://other.example.com/v1'
      AND c.api_key = 'replacement-secret'
  ) THEN
    RAISE EXCEPTION 'Connection and key were not changed together';
  END IF;
  PERFORM public.update_external_ai_model(test_model_id, 'changed-again',
    'https://other.example.com/v1', '', 'openai-compatible');
  IF (SELECT api_key FROM public.ai_model_credentials WHERE model_id = test_model_id) <> 'replacement-secret' THEN
    RAISE EXCEPTION 'Blank update erased the stored key';
  END IF;

  PERFORM public.update_external_ai_model(test_model_id, 'changed-again',
    'https://other.example.com/v1', '', 'openai-compatible', NULL, 32768);
  IF (SELECT (config->>'contextSize')::integer FROM public.ai_models WHERE id = test_model_id) <> 32768 THEN
    RAISE EXCEPTION 'Context size not stored';
  END IF;
  BEGIN
    PERFORM public.update_external_ai_model(test_model_id, 'changed-again',
      'https://other.example.com/v1', 'must-not-change', 'openai-compatible', NULL, 0);
    RAISE EXCEPTION 'Invalid context size accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT api_key FROM public.ai_model_credentials WHERE model_id = test_model_id) <> 'replacement-secret' THEN
    RAISE EXCEPTION 'Invalid context size changed credentials';
  END IF;
  PERFORM public.update_external_ai_model(test_model_id, 'changed-again',
    'https://other.example.com/v1', '', 'openai-compatible', NULL, NULL);
  IF (SELECT config ? 'contextSize' FROM public.ai_models WHERE id = test_model_id) THEN
    RAISE EXCEPTION 'Clearing context size failed';
  END IF;
  DELETE FROM public.ai_models WHERE id = test_model_id;
  IF EXISTS (SELECT 1 FROM public.ai_model_credentials WHERE model_id = test_model_id) THEN
    RAISE EXCEPTION 'Credentials were not removed with their model';
  END IF;
END $test$;
ROLLBACK;
