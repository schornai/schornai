-- Run with psql -v ON_ERROR_STOP=1 against a migrated local Supabase database.
BEGIN;
INSERT INTO public.organizations(id,name,description) VALUES ('mcp-own','Own',''), ('mcp-other','Other','');
SET LOCAL ROLE service_role;
DO $$
DECLARE cfg jsonb := '{"roles":[{"id":"role","mcps":[{"id":"mcp","url":"https://mcp.test","headers":{"Authorization":"private-token","X-Account":"account"}}]}]}';
  saved jsonb; changed jsonb; failed boolean;
BEGIN
  PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-own','Source','',cfg);
  SELECT config INTO saved FROM public.chatbots WHERE id='mcp-source';
  IF saved #> '{roles,0,mcps,0,headers}' <> '{"Authorization":null,"X-Account":null}'::jsonb
    OR saved::text LIKE '%private-token%' THEN RAISE EXCEPTION 'Public config contains credentials'; END IF;
  IF (SELECT headers->>'Authorization' FROM public.agent_mcp_credentials WHERE agent_id='mcp-source') <> 'private-token'
    THEN RAISE EXCEPTION 'Private credentials missing'; END IF;
  PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-own','Renamed','',saved,'mcp-own');
  IF (SELECT headers->>'Authorization' FROM public.agent_mcp_credentials WHERE agent_id='mcp-source') <> 'private-token'
    THEN RAISE EXCEPTION 'Unchanged credentials lost'; END IF;

  -- A saved value may not be reused at a different endpoint or with another name.
  FOREACH changed IN ARRAY ARRAY[
    jsonb_set(saved,'{roles,0,mcps,0,url}','"https://different.test"'),
    jsonb_set(saved,'{roles,0,mcps,0,headers}','{"X-New":null}')
  ] LOOP
    failed := false;
    BEGIN
      PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-own','Forbidden','',changed,'mcp-own');
    EXCEPTION WHEN raise_exception THEN failed := true;
    END;
    IF NOT failed THEN RAISE EXCEPTION 'Retained credentials were redirected'; END IF;
    IF (SELECT name FROM public.chatbots WHERE id='mcp-source') <> 'Renamed' THEN RAISE EXCEPTION 'Failed write changed metadata'; END IF;
  END LOOP;

  -- Copies require the source workspace read and authorized by the caller.
  failed := false;
  BEGIN
    PERFORM public.save_agent_with_mcp_credentials('mcp-copy','mcp-other','Copy','',saved,null,'mcp-source','mcp-other');
  EXCEPTION WHEN raise_exception THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Wrong source workspace accepted'; END IF;
  PERFORM public.save_agent_with_mcp_credentials('mcp-copy','mcp-other','Copy','',saved,null,'mcp-source','mcp-own');
  IF (SELECT headers FROM public.agent_mcp_credentials WHERE agent_id='mcp-copy') IS DISTINCT FROM
    (SELECT headers FROM public.agent_mcp_credentials WHERE agent_id='mcp-source') THEN RAISE EXCEPTION 'Copy lost credentials'; END IF;

  -- Changing/deleting one header preserves only the explicitly retained names.
  changed := jsonb_set(saved,'{roles,0,mcps,0,headers}','{"Authorization":"replacement"}');
  PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-own','Updated','',changed,'mcp-own');
  IF (SELECT headers FROM public.agent_mcp_credentials WHERE agent_id='mcp-source') <> '{"Authorization":"replacement"}'::jsonb
    THEN RAISE EXCEPTION 'Replacement/deletion failed'; END IF;

  -- A failure after the metadata write rolls back credentials and metadata together.
  changed := jsonb_set(cfg,'{roles}',(cfg->'roles') || (cfg->'roles'));
  BEGIN
    PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-own','Broken','',changed,'mcp-own');
    RAISE EXCEPTION 'Duplicate credentials accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF (SELECT name FROM public.chatbots WHERE id='mcp-source') <> 'Updated' OR
    (SELECT headers->>'Authorization' FROM public.agent_mcp_credentials WHERE agent_id='mcp-source') <> 'replacement'
    THEN RAISE EXCEPTION 'Partial save escaped rollback'; END IF;

  failed := false;
  BEGIN
    PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-other','Moved','',saved,'mcp-other');
  EXCEPTION WHEN raise_exception THEN failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Stale authorization accepted'; END IF;

  PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-own','Removed','', '{"roles":[]}', 'mcp-own');
  IF EXISTS (SELECT 1 FROM public.agent_mcp_credentials WHERE agent_id='mcp-source') THEN RAISE EXCEPTION 'Removed role retained credentials'; END IF;
  DELETE FROM public.chatbots WHERE id='mcp-copy';
  IF EXISTS (SELECT 1 FROM public.agent_mcp_credentials WHERE agent_id='mcp-copy') THEN RAISE EXCEPTION 'Deleted agent retained credentials'; END IF;
  PERFORM public.save_agent_with_mcp_credentials('mcp-source','mcp-own','Source','',cfg,'mcp-own');
END;
$$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$
DECLARE r text; cfg jsonb;
BEGIN
  FOREACH r IN ARRAY ARRAY['user','editor','workspace-admin','admin'] LOOP
    PERFORM set_config('request.jwt.claims', jsonb_build_object('organization_roles', CASE WHEN r='admin' THEN '"admin"'::jsonb ELSE jsonb_build_array(jsonb_build_object('organization_id','mcp-own','role',r)) END)::text, true);
    SELECT config INTO cfg FROM public.chatbots WHERE id='mcp-source';
    IF cfg IS NULL OR cfg::text LIKE '%private-token%' THEN RAISE EXCEPTION 'Wrong public view'; END IF;
    BEGIN PERFORM headers FROM public.agent_mcp_credentials; RAISE EXCEPTION 'Credential reads allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN INSERT INTO public.agent_mcp_credentials VALUES ('mcp-source','role','injected','url','{}'); RAISE EXCEPTION 'Credential writes allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN PERFORM public.save_agent_with_mcp_credentials('injected','mcp-own','Injected','','{"roles":[]}'); RAISE EXCEPTION 'Privileged RPC allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF r IN ('workspace-admin','admin') THEN
      BEGIN UPDATE public.chatbots SET config=jsonb_set(cfg,'{roles,0,mcps,0,headers}','{"Authorization":"raw-secret"}') WHERE id='mcp-source'; RAISE EXCEPTION 'Raw header accepted';
      EXCEPTION WHEN check_violation THEN NULL; END;
      BEGIN UPDATE public.chatbots SET config='{"roles":[{"toolWebAccess":{"webSearchApiKey":"raw-key"}}]}' WHERE id='mcp-source'; RAISE EXCEPTION 'Legacy web key accepted';
      EXCEPTION WHEN check_violation THEN NULL; END;
    END IF;
  END LOOP;
  PERFORM set_config('request.jwt.claims','{"organization_roles":[{"organization_id":"mcp-other","role":"workspace-admin"}]}',true);
  IF EXISTS(SELECT 1 FROM public.chatbots WHERE id='mcp-source') THEN RAISE EXCEPTION 'Cross-workspace config exposed'; END IF;
END;
$$;
RESET ROLE;
ROLLBACK;
