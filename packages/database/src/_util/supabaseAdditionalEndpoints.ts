export type SSOProviderAttributeMappingKeys = Record<
  string,
  { array?: boolean; name?: string }
>;

export type SSOProvider = {
  created_at: string;
  disabled: boolean | null;
  domains: string[];
  id: string;
  saml: {
    attribute_mapping?: { keys?: SSOProviderAttributeMappingKeys };
    entity_id: string;
    metadata_url?: string;
    metadata_xml?: string;
  };
  updated_at: string;
};

function getEnvSafe(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }

  return value;
}

export async function DANGERcreateSSOProvider(
  provider: { metadata_url: string } | { metadata_xml: string },
) {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/sso/providers`, {
    body: JSON.stringify({
      ...provider,
      type: "saml",
    }),
    headers: {
      APIKey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Could not create SSO provider");
  }
}

export async function DANGERgetSSOProviders() {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/sso/providers`, {
    headers: {
      APIKey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  return (await response.json()) as {
    items?: SSOProvider[];
  };
}

export async function DANGERgetSSOProviderById(providerId: string) {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/sso/providers/${providerId}`,
    {
      headers: {
        APIKey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch SSO provider");
  }

  return (await response.json()) as SSOProvider;
}

export async function DANGERupdateSSOProviderAttributeMappings(
  providerId: string,
  attribute_mapping: SSOProvider["saml"]["attribute_mapping"],
) {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/sso/providers/${providerId}`,
    {
      body: JSON.stringify({
        attribute_mapping,
      }),
      headers: {
        APIKey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update SSO provider attribute mappings");
  }

  return (await response.json()) as SSOProvider;
}

export async function DANGERdeleteSSOProvider(providerId: string) {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = getEnvSafe("SUPABASE_SERVICE_ROLE_KEY");

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/sso/providers/${providerId}`,
    {
      headers: {
        APIKey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error("Could not delete SSO provider");
  }
}
