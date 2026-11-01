import type { ServiceRoleConfig } from "./_types.ts";
import { createSSOAuthHeaders } from "./_utils.ts";

export async function addSSOProvider(
  provider: { metadata_url: string } | { metadata_xml: string },
  {
    supabaseServiceRoleConfig,
  }: {
    supabaseServiceRoleConfig: ServiceRoleConfig;
  },
) {
  const response = await fetch(
    `${supabaseServiceRoleConfig.supabaseUrl}/auth/v1/admin/sso/providers`,
    {
      body: JSON.stringify({
        ...provider,
        type: "saml",
      }),
      headers: {
        ...createSSOAuthHeaders(supabaseServiceRoleConfig),
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("addSSOProvider() - Could not add SSO provider");
  }
}
