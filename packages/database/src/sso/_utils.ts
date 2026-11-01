import type { ServiceRoleConfig } from "./_types.ts";

export function createSSOAuthHeaders({
  supabaseServiceRoleKey,
}: ServiceRoleConfig) {
  return {
    APIKey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
  };
}
