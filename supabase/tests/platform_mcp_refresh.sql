begin;
insert into auth.users(id) values ('11111111-1111-4111-8111-111111111111');
insert into public.platform_mcp_clients(id,name,redirect_uris) values ('22222222-2222-4222-8222-222222222222','Test','["https://client.test/callback"]');
insert into public.platform_mcp_grants(id,client_id,user_id,resource,access_level,redirect_uri,challenge,code_hash,code_expires_at)
values ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','https://box.test/mcp','editor','https://client.test/callback','challenge','code',now()+interval '5 minutes');
set local role service_role;
do $$
declare
  c uuid := '22222222-2222-4222-8222-222222222222';
  deadline timestamptz;
begin
  if public.exchange_platform_mcp_tokens(c,'code','bad','https://client.test/callback','https://box.test/mcp','a1','r1') is not null then raise exception 'PKCE bypass'; end if;
  if public.exchange_platform_mcp_tokens(c,'code','challenge','https://client.test/callback','https://box.test/mcp','a1','r1') <> 'editor' then raise exception 'Initial exchange failed'; end if;
  select refresh_expires_at into deadline from public.platform_mcp_grants where access_hash='a1';
  if deadline <> now()+interval '30 days' then raise exception 'Wrong consent lifetime'; end if;
  if public.exchange_platform_mcp_tokens(c,'code','challenge','https://client.test/callback','https://box.test/mcp','a2','r2') is not null then raise exception 'Code reused'; end if;
  if public.refresh_platform_mcp_tokens('99999999-9999-4999-8999-999999999999','r1','a2','r2','https://box.test/mcp') is not null then raise exception 'Client binding bypass'; end if;
  if public.refresh_platform_mcp_tokens(c,'r1','a2','r2','https://other.test/mcp') is not null then raise exception 'Resource binding bypass'; end if;
  if public.refresh_platform_mcp_tokens(c,'r1','a2','r2','https://box.test/mcp','admin') is not null then raise exception 'Scope escalation'; end if;
  -- A malformed request must not consume the token; access may have expired.
  update public.platform_mcp_grants set access_expires_at=now()-interval '1 second';
  if public.refresh_platform_mcp_tokens(c,'r1','a2','r2','https://box.test/mcp') <> 'editor' then raise exception 'Refresh failed'; end if;
  if exists(select 1 from public.platform_mcp_grants where access_hash='a1') then raise exception 'Old access remains'; end if;
  if not exists(select 1 from public.platform_mcp_grants where access_hash='a2' and refresh_expires_at=deadline and access_expires_at>now()) then raise exception 'Refresh changed consent or failed'; end if;
  if public.refresh_platform_mcp_tokens(c,'r1','a3','r3','https://box.test/mcp') is not null then raise exception 'Replay accepted'; end if;
  if exists(select 1 from public.platform_mcp_grants where access_hash='a2') or exists(select 1 from public.platform_mcp_refresh_tokens) then raise exception 'Replay did not revoke family'; end if;
end $$;
reset role;
-- Independent grants cover expiry, both revocation token types,
-- and near-deadline access expiry. All use the same original consent ceiling.
do $$
declare
  c uuid := '22222222-2222-4222-8222-222222222222';
  scenario text;
begin
  foreach scenario in array array['expired','access','refresh','deadline'] loop
    insert into public.platform_mcp_grants(client_id,user_id,resource,access_level,redirect_uri,challenge,code_hash,code_expires_at)
      values(c,'11111111-1111-4111-8111-111111111111','https://box.test/mcp','user','https://client.test/callback','pkce',scenario,now()+interval '5 minutes');
    perform public.exchange_platform_mcp_tokens(c,scenario,'pkce','https://client.test/callback','https://box.test/mcp','a-'||scenario,'r-'||scenario);
    if scenario='expired' then
      update public.platform_mcp_grants set refresh_expires_at=now()-interval '1 second' where access_hash='a-expired';
      if public.refresh_platform_mcp_tokens(c,'r-expired','a-new','r-new','https://box.test/mcp') is not null then raise exception 'Expired refresh accepted'; end if;
    elsif scenario='deadline' then
      update public.platform_mcp_grants set refresh_expires_at=now()+interval '10 seconds' where access_hash='a-deadline';
      perform public.refresh_platform_mcp_tokens(c,'r-deadline','a-final','r-final','https://box.test/mcp');
      if not exists(select 1 from public.platform_mcp_grants where access_hash='a-final' and access_expires_at=refresh_expires_at) then raise exception 'Access exceeds consent expiry'; end if;
      perform public.revoke_platform_mcp_grant(c,'r-deadline'); -- consumed token also revokes
    else
      perform public.revoke_platform_mcp_grant('99999999-9999-4999-8999-999999999999','r-'||scenario);
      if not exists(select 1 from public.platform_mcp_grants where access_hash='a-'||scenario) then raise exception 'Wrong client revoked'; end if;
      perform public.revoke_platform_mcp_grant(c,(case when scenario='access' then 'a-' else 'r-' end)||scenario);
    end if;
  end loop;
  if exists(select 1 from public.platform_mcp_grants where client_id=c) then raise exception 'Grant not revoked'; end if;
  if has_table_privilege('authenticated','public.platform_mcp_refresh_tokens','SELECT') or has_table_privilege('anon','public.platform_mcp_refresh_tokens','INSERT') then raise exception 'Refresh credentials exposed'; end if;
  if not (select relrowsecurity from pg_class where oid='public.platform_mcp_refresh_tokens'::regclass) then raise exception 'RLS disabled'; end if;
  if has_function_privilege('authenticated','public.refresh_platform_mcp_tokens(uuid,text,text,text,text,text)','EXECUTE')
    or has_function_privilege('anon','public.exchange_platform_mcp_tokens(uuid,text,text,text,text,text,text)','EXECUTE')
    or has_function_privilege('authenticated','public.revoke_platform_mcp_grant(uuid,text)','EXECUTE') then raise exception 'RPC exposed'; end if;
end $$;
rollback;
