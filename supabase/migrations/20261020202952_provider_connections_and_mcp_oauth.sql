-- Credentials are server-only. Application callers must first authenticate the
-- user and authorize access to the configured agent/MCP endpoint.
create table public.mcp_oauth_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  server_url text not null,
  data jsonb not null default '{}'::jsonb,
  version uuid not null,
  state text unique,
  state_expires_at timestamptz,
  primary key (user_id, server_url)
);
alter table public.mcp_oauth_sessions enable row level security;
revoke all on public.mcp_oauth_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.mcp_oauth_sessions to service_role;
comment on table public.mcp_oauth_sessions is 'Server-only per-user MCP OAuth credentials. No browser access; version provides optimistic concurrency control.';

-- Shared provider connections are managed by global administrators. Public
-- agent config stores only references; credentials never enter browser reads.
create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  kind text not null check (kind in ('oauth', 'brave', 'staan')),
  client_id text,
  secret text,
  market text,
  version uuid not null default gen_random_uuid(),
  constraint provider_connections_oauth_client_check check (kind <> 'oauth' or (client_id is not null and length(btrim(client_id)) > 0)),
  constraint provider_connections_check1 check (kind = 'oauth' or (secret is not null and length(btrim(secret)) > 0))
);
alter table public.provider_connections enable row level security;
revoke all on public.provider_connections from public, anon, authenticated;
grant select, insert, update, delete on public.provider_connections to service_role;
comment on table public.provider_connections is 'Server-only OAuth apps and search API credentials. Metadata may be listed for authenticated agent editors; only global admins may mutate. Runtime reads require prior authorization of agent access.';

-- Move existing credentials and their references together in this migration's
-- transaction. No user is left with a reference whose credentials were lost.
DO $migration$
DECLARE a record; r jsonb; migrated_roles jsonb; connection_id uuid; search jsonb;
BEGIN
  FOR a IN SELECT id, name, config FROM public.chatbots WHERE jsonb_typeof(config->'roles') = 'array' LOOP
    migrated_roles := '[]'::jsonb;
    FOR r IN SELECT value FROM jsonb_array_elements(a.config->'roles') LOOP
      search := r->'toolWebAccess';
      IF jsonb_typeof(search) = 'object' THEN
        IF length(btrim(coalesce(search->>'webSearchApiKey', ''))) > 0 AND search->>'webSearchProvider' IN ('brave', 'staan') THEN
          INSERT INTO public.provider_connections(name, kind, secret, market)
          VALUES (a.name || ' · ' || coalesce(nullif(r->>'name', ''), 'Suche'), search->>'webSearchProvider', search->>'webSearchApiKey', search->>'webSearchMarket')
          RETURNING id INTO connection_id;
          search := search || jsonb_build_object('webSearchConnectionId', connection_id);
        END IF;
        r := jsonb_set(r, '{toolWebAccess}', search - 'webSearchApiKey' - 'webSearchMarket');
      END IF;
      migrated_roles := migrated_roles || jsonb_build_array(r);
    END LOOP;
    UPDATE public.chatbots SET config = jsonb_set(config, '{roles}', migrated_roles) WHERE id = a.id;
  END LOOP;
END $migration$;
