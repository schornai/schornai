-- One consent lasts at most 30 days. Store only hashes, including consumed
-- refresh credentials so replay can revoke the whole grant (RFC 9700 §4.14).
alter table public.platform_mcp_grants add column refresh_expires_at timestamptz;
create table public.platform_mcp_refresh_tokens (
  token_hash text primary key,
  grant_id uuid not null references public.platform_mcp_grants(id) on delete cascade,
  consumed_at timestamptz
);
create index platform_mcp_refresh_tokens_grant_id_idx on public.platform_mcp_refresh_tokens(grant_id);
alter table public.platform_mcp_refresh_tokens enable row level security;
revoke all on public.platform_mcp_refresh_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.platform_mcp_refresh_tokens to service_role;

-- The code consumption and initial refresh credential must commit together.
-- Keep the old code-only RPC for in-flight deployments; new callers use this RPC.
create function public.exchange_platform_mcp_tokens(
  p_client_id uuid, p_code_hash text, p_challenge text,
  p_redirect_uri text, p_resource text, p_access_hash text, p_refresh_hash text
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_grant public.platform_mcp_grants;
begin
  update public.platform_mcp_grants g
    set code_hash = null, access_hash = p_access_hash,
        access_expires_at = now() + interval '1 hour',
        refresh_expires_at = now() + interval '30 days'
    where g.client_id = p_client_id and g.code_hash = p_code_hash
      and g.code_expires_at > now() and g.challenge = p_challenge
      and g.redirect_uri = p_redirect_uri and g.resource = p_resource
    returning g.* into v_grant;
  if not found then return null; end if;
  insert into public.platform_mcp_refresh_tokens(token_hash, grant_id)
    values (p_refresh_hash, v_grant.id);
  return v_grant.access_level;
end;
$$;

-- Serialize rotation on the grant, including across web instances. Consumed
-- token hashes remain until grant deletion: replay invalidates every descendant.
create function public.refresh_platform_mcp_tokens(
  p_client_id uuid, p_refresh_hash text, p_access_hash text,
  p_next_refresh_hash text, p_resource text default null, p_scope text default null
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_grant public.platform_mcp_grants;
  v_consumed timestamptz;
begin
  select g.* into v_grant from public.platform_mcp_grants g
    join public.platform_mcp_refresh_tokens r on r.grant_id = g.id
    where r.token_hash = p_refresh_hash and g.client_id = p_client_id
      and (p_resource is null or g.resource = p_resource)
      and (p_scope is null or g.access_level = p_scope)
    for update of g;
  if not found then return null; end if;
  select consumed_at into v_consumed from public.platform_mcp_refresh_tokens
    where token_hash = p_refresh_hash;
  if v_consumed is not null or v_grant.refresh_expires_at is null
    or v_grant.refresh_expires_at <= now()
    then
    delete from public.platform_mcp_grants where id = v_grant.id;
    return null;
  end if;
  update public.platform_mcp_refresh_tokens set consumed_at = now()
    where token_hash = p_refresh_hash;
  insert into public.platform_mcp_refresh_tokens(token_hash, grant_id)
    values (p_next_refresh_hash, v_grant.id);
  update public.platform_mcp_grants
    set access_hash = p_access_hash,
        access_expires_at = least(now() + interval '1 hour', refresh_expires_at)
    where id = v_grant.id;
  return v_grant.access_level;
end;
$$;

-- Either token type revokes the complete consent, including consumed refresh
-- tokens. Client binding prevents an unrelated client from revoking a grant.
create function public.revoke_platform_mcp_grant(p_client_id uuid, p_token_hash text)
returns void language sql security invoker set search_path = '' as $$
  delete from public.platform_mcp_grants g where g.client_id = p_client_id
    and (g.access_hash = p_token_hash or exists (
      select 1 from public.platform_mcp_refresh_tokens r
      where r.grant_id = g.id and r.token_hash = p_token_hash
    ));
$$;
revoke all on function public.exchange_platform_mcp_tokens(uuid,text,text,text,text,text,text),
  public.refresh_platform_mcp_tokens(uuid,text,text,text,text,text),
  public.revoke_platform_mcp_grant(uuid,text) from public, anon, authenticated;
grant execute on function public.exchange_platform_mcp_tokens(uuid,text,text,text,text,text,text),
  public.refresh_platform_mcp_tokens(uuid,text,text,text,text,text),
  public.revoke_platform_mcp_grant(uuid,text) to service_role;
