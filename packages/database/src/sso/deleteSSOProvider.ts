import type { ServiceRoleConfig } from "./_types.ts";
import { createSSOAuthHeaders } from "./_utils.ts";
import { getSSOProvider } from "./getSSOProvider.ts";

export async function deleteSSOProvider({
  supabaseServiceRoleConfig,
}: {
  supabaseServiceRoleConfig: ServiceRoleConfig;
}) {
  const provider = await getSSOProvider({ supabaseServiceRoleConfig });

  const response = await fetch(
    `${supabaseServiceRoleConfig.supabaseUrl}/auth/v1/admin/sso/providers/${provider.id}`,
    {
      headers: {
        ...createSSOAuthHeaders(supabaseServiceRoleConfig),
        "Content-Type": "application/json",
      },
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error("deleteSSOProvider() - Could not delete SSO provider");
  }
}
