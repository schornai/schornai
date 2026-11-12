DROP FUNCTION public.create_external_ai_model(text,text,text,text,text,text);
DROP FUNCTION public.update_external_ai_model(text,text,text,text,text,text);

-- The public connection and its private key must commit together. Otherwise a
-- failed edit can send the new key to the previous endpoint, or leave an orphan.
-- These small transactional wrappers are server-only. The application must
-- authorize a global administrator before calling them with service_role.
CREATE FUNCTION public.create_external_ai_model(
  model_name text, external_model_id text, base_url text, api_key text,
  provider text DEFAULT 'openai-compatible', region text DEFAULT NULL, context_size integer DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  new_id text := pg_catalog.gen_random_uuid()::text;
BEGIN
  IF context_size IS NOT NULL AND context_size <= 0 THEN
    RAISE EXCEPTION 'Invalid context size' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.ai_models (id, name, identifier, type, config)
  VALUES (new_id, model_name, 'external:' || new_id, 'external_llm_v1',
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'provider', provider, 'modelId', external_model_id, 'baseUrl', base_url,
      'headers', '{}'::jsonb, 'region', region, 'contextSize', context_size
    )));
  INSERT INTO public.ai_model_credentials (model_id, api_key)
  VALUES (new_id, api_key);
  RETURN new_id;
END;
$function$;

CREATE FUNCTION public.update_external_ai_model(
  target_model_id text, external_model_id text, base_url text, api_key text,
  provider text, region text DEFAULT NULL, context_size integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $function$
DECLARE
  existing_model public.ai_models%ROWTYPE;
BEGIN
  IF context_size IS NOT NULL AND context_size <= 0 THEN
    RAISE EXCEPTION 'Invalid context size' USING ERRCODE = '22023';
  END IF;
  -- Serialize edits of the same model so connection/key pairs cannot interleave.
  SELECT * INTO existing_model FROM public.ai_models
  WHERE id = target_model_id FOR UPDATE;
  IF NOT FOUND OR existing_model.type <> 'external_llm_v1'
    OR existing_model.config->>'provider' IS DISTINCT FROM provider THEN
    RAISE EXCEPTION 'Invalid external model' USING ERRCODE = '22023';
  END IF;
  UPDATE public.ai_models SET config = pg_catalog.jsonb_strip_nulls(
    pg_catalog.jsonb_build_object(
      'provider', provider, 'modelId', external_model_id, 'baseUrl', base_url,
      'headers', '{}'::jsonb, 'region', region, 'contextSize', context_size
    )
  ) WHERE id = target_model_id;
  IF api_key <> '' THEN
    INSERT INTO public.ai_model_credentials AS credentials (model_id, api_key)
    VALUES (target_model_id, api_key)
    ON CONFLICT (model_id) DO UPDATE SET api_key = EXCLUDED.api_key;
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_external_ai_model(text,text,text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_external_ai_model(text,text,text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_external_ai_model(text,text,text,text,text,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_external_ai_model(text,text,text,text,text,text,integer) TO service_role;
