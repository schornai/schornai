import type { SSOProvider, ServiceRoleConfig } from "./_types.ts";
import { createSSOAuthHeaders } from "./_utils.ts";

export async function getSSOProvider({
  supabaseServiceRoleConfig,
}: {
  supabaseServiceRoleConfig: ServiceRoleConfig;
}) {
  const response = await fetch(
    `${supabaseServiceRoleConfig.supabaseUrl}/auth/v1/admin/sso/providers`,
    {
      headers: {
        ...createSSOAuthHeaders(supabaseServiceRoleConfig),
        "Content-Type": "application/json",
      },
    },
  );

  const providers = (await response.json()) as {
    items?: SSOProvider[];
  };

  const [provider, ...rest] = providers.items ?? [];

  if (!provider) {
    throw new Error("NOT_FOUND /auth/v1/admin/sso/providers");
  }

  if (rest.length !== 0) {
    throw new Error("NOT_SUPPORTED More than on sso provider");
  }

  return provider;
}
