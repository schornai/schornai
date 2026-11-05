-- Header values move out of the member-readable agent config. Saving metadata
-- and credentials is one transaction; the caller authorizes source and target
-- workspaces before using this service-role-only function. Expected workspace
-- predicates are rechecked under a row lock to reject stale authorization.
SET local check_function_bodies = off;

CREATE TABLE "public"."agent_mcp_credentials" (
  "agent_id" text  NOT NULL,
  "role_id"  text  NOT NULL,
  "mcp_id"   text  NOT NULL,
  "url"      text  NOT NULL,
  "headers"  jsonb NOT NULL,
  CONSTRAINT "agent_mcp_credentials_headers_check" CHECK ((jsonb_typeof(headers) = 'object'::text)),
  CONSTRAINT "agent_mcp_credentials_pkey" PRIMARY KEY (agent_id, role_id, mcp_id)
);

ALTER TABLE "public"."agent_mcp_credentials"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."agent_mcp_credentials" FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.agent_config_has_no_credentials (
  p_config jsonb
)
  RETURNS boolean
  LANGUAGE plpgsql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
declare r jsonb; m jsonb; h jsonb;
begin
  for r in select value from jsonb_array_elements(coalesce(p_config->'roles', '[]')) loop
    if (r->'toolWebAccess') ? 'webSearchApiKey' then return false; end if;
    for m in select value from jsonb_array_elements(coalesce(r->'mcps', '[]')) loop
      if jsonb_typeof(m->'headers') is distinct from 'object' then return false; end if;
      for h in select value from jsonb_each(m->'headers') loop
        if h is distinct from 'null'::jsonb then return false; end if;
      end loop;
    end loop;
  end loop;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_agent_with_mcp_credentials (
  p_agent_id              text,
  p_workspace_id          text,
  p_name                  text,
  p_description           text,
  p_config                jsonb,
  p_expected_workspace_id text  DEFAULT NULL::text,
  p_copy_agent_id         text  DEFAULT NULL::text,
  p_copy_workspace_id     text  DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  source_id text; source_workspace text; r jsonb; m jsonb; h record;
  roles_out jsonb := '[]'; mcps_out jsonb; headers_out jsonb; private_headers jsonb;
  credentials_out jsonb := '[]'; old_headers jsonb; old_url text;
begin
  if p_expected_workspace_id is not null then
    if p_copy_agent_id is not null then raise exception 'AGENT_SAVE_FAILED'; end if;
    perform 1 from public.chatbots where id = p_agent_id and organization_id = p_expected_workspace_id for update;
    if not found then raise exception 'AGENT_SAVE_FAILED'; end if;
    source_id := p_agent_id;
  elsif p_copy_agent_id is not null then
    select organization_id into source_workspace from public.chatbots where id = p_copy_agent_id for update;
    if not found or source_workspace is distinct from p_copy_workspace_id then raise exception 'AGENT_SAVE_FAILED'; end if;
    source_id := p_copy_agent_id;
  end if;

  for r in select value from jsonb_array_elements(p_config->'roles') loop
    mcps_out := '[]';
    for m in select value from jsonb_array_elements(coalesce(r->'mcps', '[]')) loop
      headers_out := '{}'; private_headers := '{}';
      select headers, url into old_headers, old_url from public.agent_mcp_credentials
        where agent_id = source_id and role_id = r->>'id' and mcp_id = m->>'id';
      for h in select key, value from jsonb_each(m->'headers') loop
        if h.value = 'null'::jsonb then
          if old_url is distinct from m->>'url' or not coalesce(old_headers ? h.key, false) then
            raise exception 'MCP_CREDENTIAL_REENTRY_REQUIRED';
          end if;
          private_headers := private_headers || jsonb_build_object(h.key, old_headers->h.key);
        elsif jsonb_typeof(h.value) = 'string' and length(h.value #>> '{}') > 0 then
          private_headers := private_headers || jsonb_build_object(h.key, h.value);
        else
          raise exception 'MCP_CREDENTIAL_INVALID';
        end if;
        headers_out := headers_out || jsonb_build_object(h.key, null);
      end loop;
      if private_headers <> '{}'::jsonb then
        credentials_out := credentials_out || jsonb_build_array(jsonb_build_object(
          'role_id', r->>'id', 'mcp_id', m->>'id', 'url', m->>'url', 'headers', private_headers));
      end if;
      mcps_out := mcps_out || jsonb_build_array(jsonb_set(m, '{headers}', headers_out));
    end loop;
    if r ? 'mcps' then r := jsonb_set(r, '{mcps}', mcps_out); end if;
    roles_out := roles_out || jsonb_build_array(r);
  end loop;
  p_config := jsonb_set(p_config, '{roles}', roles_out);
  if p_expected_workspace_id is null then
    insert into public.chatbots(id, organization_id, name, description, config, roles)
      values(p_agent_id, p_workspace_id, p_name, p_description, p_config, '{}');
  else
    update public.chatbots set organization_id = p_workspace_id, name = p_name,
      description = p_description, config = p_config, roles = '{}' where id = p_agent_id;
  end if;
  delete from public.agent_mcp_credentials where agent_id = p_agent_id;
  insert into public.agent_mcp_credentials(agent_id, role_id, mcp_id, url, headers)
    select p_agent_id, c->>'role_id', c->>'mcp_id', c->>'url', c->'headers'
    from jsonb_array_elements(credentials_out) c;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."save_agent_with_mcp_credentials"(text, text, text, text, jsonb, text, text, text) FROM PUBLIC, "anon", "authenticated";

ALTER TABLE "public"."agent_mcp_credentials"
  ADD CONSTRAINT "agent_mcp_credentials_agent_id_fkey" FOREIGN KEY (agent_id) REFERENCES public.chatbots(id) ON DELETE CASCADE;

GRANT EXECUTE ON FUNCTION "public"."agent_config_has_no_credentials"(jsonb) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."agent_config_has_no_credentials"(jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."agent_config_has_no_credentials"(jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."agent_config_has_no_credentials"(jsonb) TO "service_role";

REVOKE ALL ON FUNCTION "public"."save_agent_with_mcp_credentials"(text, text, text, text, jsonb, text, text, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_agent_with_mcp_credentials"(text, text, text, text, jsonb, text, text, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_agent_with_mcp_credentials"(text, text, text, text, jsonb, text, text, text) TO "service_role";

REVOKE ALL ON TABLE "public"."agent_mcp_credentials" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."agent_mcp_credentials" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."agent_mcp_credentials" TO "service_role";

-- Move every configured MCP header, including non-Authorization headers. The
-- public config retains only names; legacy empty values remain usable unchanged.
do $$
declare a record; r jsonb; m jsonb; roles_out jsonb; mcps_out jsonb; headers_out jsonb;
begin
  for a in select id, config from public.chatbots where jsonb_typeof(config->'roles') = 'array' for update loop
    roles_out := '[]';
    for r in select value from jsonb_array_elements(a.config->'roles') loop
      if r ? 'mcps' then
        r := jsonb_set(r, '{id}', coalesce(r->'id', to_jsonb(gen_random_uuid()::text)));
        mcps_out := '[]';
        for m in select value from jsonb_array_elements(r->'mcps') loop
          if coalesce(m->'headers', '{}') <> '{}'::jsonb then
            insert into public.agent_mcp_credentials(agent_id, role_id, mcp_id, url, headers)
              values(a.id, r->>'id', m->>'id', m->>'url', m->'headers');
          end if;
          select coalesce(jsonb_object_agg(key, 'null'::jsonb), '{}') into headers_out from jsonb_each(coalesce(m->'headers', '{}'));
          mcps_out := mcps_out || jsonb_build_array(jsonb_set(m, '{headers}', headers_out));
        end loop;
        r := jsonb_set(r, '{mcps}', mcps_out);
      end if;
      roles_out := roles_out || jsonb_build_array(r);
    end loop;
    update public.chatbots set config = jsonb_set(a.config, '{roles}', roles_out) where id = a.id;
  end loop;
end;
$$;

ALTER TABLE "public"."chatbots"
  ADD CONSTRAINT "chatbots_config_no_credentials" CHECK (public.agent_config_has_no_credentials(config));

