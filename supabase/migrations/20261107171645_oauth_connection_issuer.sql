-- Existing OAuth apps need an administrator-supplied issuer; never infer it from MCP discovery.
ALTER TABLE public.provider_connections ADD COLUMN issuer text;
ALTER TABLE public.provider_connections ADD CONSTRAINT provider_connections_issuer_kind
  CHECK (issuer IS NULL OR (kind = 'oauth' AND length(btrim(issuer)) > 0));
COMMENT ON COLUMN public.provider_connections.issuer IS 'Administrator-configured OAuth issuer binding for pre-registered client credentials.';
