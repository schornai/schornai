begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into public.platform_mcp_clients(id,name,redirect_uris) values ('22222222-2222-4222-8222-222222222222','Test','["https://client.example/callback"]');
insert into public.platform_mcp_grants(client_id,user_id,resource,access_level,redirect_uri,challenge,code_hash,code_expires_at) values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','https://example.test/mcp','user','https://client.example/callback','challenge','code',now()+interval '5 minutes');
do $$
begin
  if has_table_privilege('authenticated','public.platform_mcp_grants','SELECT') or has_table_privilege('anon','public.platform_mcp_clients','INSERT') then raise exception 'OAuth credentials exposed'; end if;
  if has_function_privilege('authenticated','public.exchange_platform_mcp_code(uuid,text,text,text,text,text)','EXECUTE') then raise exception 'Code exchange exposed'; end if;
  if public.exchange_platform_mcp_code('22222222-2222-4222-8222-222222222222','code','wrong','https://client.example/callback','https://example.test/mcp','access') then raise exception 'Wrong PKCE accepted'; end if;
  if public.exchange_platform_mcp_code('22222222-2222-4222-8222-222222222222','code','challenge','https://client.example/callback','https://example.test/mcp/admin','access') then raise exception 'Wrong resource accepted'; end if;
  if public.exchange_platform_mcp_code('22222222-2222-4222-8222-222222222222','code','challenge','https://attacker.example','https://example.test/mcp','access') then raise exception 'Wrong redirect accepted'; end if;
  if not public.exchange_platform_mcp_code('22222222-2222-4222-8222-222222222222','code','challenge','https://client.example/callback','https://example.test/mcp','access') then raise exception 'Valid code rejected'; end if;
  if public.exchange_platform_mcp_code('22222222-2222-4222-8222-222222222222','code','challenge','https://client.example/callback','https://example.test/mcp','second') then raise exception 'Code replay accepted'; end if;
  if not exists(select 1 from public.platform_mcp_grants where access_hash='access' and code_hash is null and access_expires_at > now()) then raise exception 'Token missing'; end if;
end $$;
rollback;
