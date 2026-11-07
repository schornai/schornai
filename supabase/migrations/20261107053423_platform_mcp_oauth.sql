-- MCP credentials are separate from Supabase sessions: an MCP bearer token can
-- only be used at its consented resource and cannot be sent to the Data API.
create table public.platform_mcp_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  redirect_uris jsonb not null check (jsonb_typeof(redirect_uris) = 'array'),
  created_at timestamptz not null default now()
);
create table public.platform_mcp_grants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.platform_mcp_clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null,
  access_level text not null check (access_level in ('user', 'editor', 'workspace', 'admin')),
  redirect_uri text not null,
  challenge text not null,
  code_hash text unique,
  code_expires_at timestamptz not null,
  access_hash text unique,
  access_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index platform_mcp_grants_user_id_idx on public.platform_mcp_grants(user_id);
create index platform_mcp_grants_client_id_idx on public.platform_mcp_grants(client_id);
alter table public.platform_mcp_clients enable row level security;
alter table public.platform_mcp_grants enable row level security;
revoke all on public.platform_mcp_clients, public.platform_mcp_grants from public, anon, authenticated;
grant all on public.platform_mcp_clients, public.platform_mcp_grants to service_role;

-- Validation and consumption must be atomic: a code can issue only one token,
-- including across application instances. The server passes SHA-256 hashes.
create function public.exchange_platform_mcp_code(
  p_client_id uuid, p_code_hash text, p_challenge text,
  p_redirect_uri text, p_resource text, p_access_hash text
) returns boolean language sql security invoker set search_path = '' as $$
  with consumed as (
    update public.platform_mcp_grants
    set code_hash = null, access_hash = p_access_hash,
        access_expires_at = now() + interval '1 hour'
    where client_id = p_client_id and code_hash = p_code_hash
      and code_expires_at > now() and challenge = p_challenge
      and redirect_uri = p_redirect_uri and resource = p_resource
    returning id
  ) select exists(select 1 from consumed);
$$;
revoke all on function public.exchange_platform_mcp_code(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.exchange_platform_mcp_code(uuid,text,text,text,text,text) to service_role;
