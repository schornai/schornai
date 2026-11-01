import type { SSOProvider, ServiceRoleConfig } from "./_types.ts";
import { createSSOAuthHeaders } from "./_utils.ts";
import { getSSOProvider } from "./getSSOProvider.ts";

export async function updateSSOProviderAttributeMappings(
  attributeMapping: SSOProvider["saml"]["attribute_mapping"],
  {
    supabaseServiceRoleConfig,
  }: {
    supabaseServiceRoleConfig: ServiceRoleConfig;
  },
) {
  const provider = await getSSOProvider({ supabaseServiceRoleConfig });

  const response = await fetch(
    `${supabaseServiceRoleConfig.supabaseUrl}/auth/v1/admin/sso/providers/${provider.id}`,
    {
      body: JSON.stringify({ attribute_mapping: attributeMapping }),
      headers: {
        ...createSSOAuthHeaders(supabaseServiceRoleConfig),
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );

  if (!response.ok) {
    throw new Error(
      "updateProviderAttributeMappings() - Failed to update SSO provider attribute mappings",
    );
  }
}
