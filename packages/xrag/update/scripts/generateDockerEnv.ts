// FROM https://github.com/supabase/supabase/blob/794529eddf3e9d454fa2bbc169768bfd2a853d67/apps/docs/components/JwtGenerator/JwtGenerator.tsx

import { generateRandomString } from "./generateRandomString.ts";
import { generateSupabaseKey } from "./generateSupabaseKey.ts";
import { generateSecuritySecrets } from "./securitySecrets.ts";

export function generateDockerEnv({
  boxId = crypto.randomUUID(),
  samlPrivateKey,
  siteUrl = "http://replace-with-actual-site-url",
}: {
  boxId?: string;
  samlPrivateKey: string;
  siteUrl?: string;
}) {
  const BOX_ID = boxId;

  const POSTGRES_PASSWORD = generateRandomString(64);
  const JWT_SECRET = generateRandomString(40);

  const ANON_KEY = generateSupabaseKey("ANON_KEY", JWT_SECRET);
  const SERVICE_ROLE_KEY = generateSupabaseKey("SERVICE_ROLE_KEY", JWT_SECRET);

  const SECRET_KEY_BASE = generateRandomString(64);
  const VAULT_ENC_KEY = generateRandomString(32);

  const SAML_PRIVATE_KEY = samlPrivateKey;
  const {
    REALTIME_SERVER_SECRET,
    SUPABASE_AUTH_HOOK_SECRET,
    SERVICE_API_TOKEN,
  } = generateSecuritySecrets();

  return `
BOX_ID=${BOX_ID}

############
# Secrets
############

POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
SECRET_KEY_BASE=${SECRET_KEY_BASE}
VAULT_ENC_KEY=${VAULT_ENC_KEY}
SAML_PRIVATE_KEY=${SAML_PRIVATE_KEY}
REALTIME_SERVER_SECRET=${REALTIME_SERVER_SECRET}
SUPABASE_AUTH_HOOK_SECRET=${SUPABASE_AUTH_HOOK_SECRET}
SERVICE_API_TOKEN=${SERVICE_API_TOKEN}

############
# Database - You can change these to any PostgreSQL database that has logical replication enabled.
############

POSTGRES_HOST=db
POSTGRES_DB=postgres
POSTGRES_PORT=5432
# default user is postgres

############
# Supavisor -- Database pooler
############
POOLER_PROXY_PORT_TRANSACTION=6543
POOLER_DEFAULT_POOL_SIZE=20
POOLER_MAX_CLIENT_CONN=100
POOLER_TENANT_ID=schornai-box-v1


############
# API Proxy - Configuration for the Kong Reverse proxy.
############

KONG_HTTP_PORT=80
KONG_HTTPS_PORT=443


############
# API - Configuration for PostgREST.
############

PGRST_DB_SCHEMAS=public,storage,graphql_public,pgmq_public


############
# Auth - Configuration for the GoTrue authentication server.
############

## General
SITE_URL=${siteUrl}
ADDITIONAL_REDIRECT_URLS=ai.schorn.box-app-v1://**
JWT_EXPIRY=3600
DISABLE_SIGNUP=false
API_EXTERNAL_URL=${siteUrl}/auth/v1

## Mailer Config
MAILER_URLPATHS_CONFIRMATION="/auth/v1/verify"
MAILER_URLPATHS_INVITE="/auth/v1/verify"
MAILER_URLPATHS_RECOVERY="/auth/v1/verify"
MAILER_URLPATHS_EMAIL_CHANGE="/auth/v1/verify"

## Email auth
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
SMTP_ADMIN_EMAIL=admin@example.com
SMTP_HOST=supabase-mail
SMTP_PORT=2500
SMTP_USER=fake_mail_user
SMTP_PASS=fake_mail_password
SMTP_SENDER_NAME=fake_sender
ENABLE_ANONYMOUS_USERS=false

## Phone auth
ENABLE_PHONE_SIGNUP=false
ENABLE_PHONE_AUTOCONFIRM=true


############
# Studio - Configuration for the Dashboard
############

STUDIO_DEFAULT_ORGANIZATION=Default Organization
STUDIO_DEFAULT_PROJECT=Default Project

STUDIO_PORT=3000
# replace if you intend to use Studio outside of localhost
SUPABASE_PUBLIC_URL=http://localhost:8000

# Enable webp support
IMGPROXY_ENABLE_WEBP_DETECTION=true

# Add your OpenAI API key to enable SQL Editor Assistant
OPENAI_API_KEY=

############
# Functions - Configuration for Functions
############
# NOTE: VERIFY_JWT applies to all functions. Per-function VERIFY_JWT is not supported yet.
FUNCTIONS_VERIFY_JWT=false
`;
}
