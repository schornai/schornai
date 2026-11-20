BEGIN;
INSERT INTO public.organizations(id,name,description) VALUES ('identity-test','Own','');
SET LOCAL ROLE service_role;
DO $$
DECLARE config jsonb := '{"roles":[{"id":"role","mcps":[{"id":"test","url":"https://example.test","headers":{"Token":"value"}}]}]}';
BEGIN
  PERFORM public.create_agent_with_identity('agent-one','identity-test','A','','{"roles":[]}', 'team/a');
  PERFORM public.create_agent_with_identity('agent-two','identity-test','A','','{"roles":[]}', 'team/a','a-12345678');
  IF NOT EXISTS (SELECT 1 FROM public.xrag_resource_origins WHERE local_id='agent-two' AND origin_id='a-12345678')
    THEN RAISE EXCEPTION 'Missing fallback identity'; END IF;
  BEGIN
    PERFORM public.create_agent_with_identity('agent-three','identity-test','Other','',config, 'team/a');
    RAISE EXCEPTION 'Duplicate explicit identity accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'XRAG_IDENTITY_EXISTS' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.chatbots WHERE id='agent-three')
    OR EXISTS (SELECT 1 FROM public.agent_mcp_credentials WHERE agent_id='agent-three')
    THEN RAISE EXCEPTION 'Identity collision left a partial agent'; END IF;
  IF has_function_privilege('authenticated','public.create_agent_with_identity(text,text,text,text,jsonb,text,text,text,text)','EXECUTE')
    THEN RAISE EXCEPTION 'Privileged agent creation exposed'; END IF;
END;
$$;
ROLLBACK;
