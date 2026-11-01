import type { RoleName } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getCurrentUserClaims } from "./getCurrentUserClaims.ts";

export async function joinPermissions<T extends { organizationId?: string }>(
  array: T[],
  { supabase }: { supabase: SupabaseClient },
): Promise<(T & { permission?: RoleName })[]> {
  const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });

  if (claims === "admin") {
    return array.map((item) => ({ ...item, permission: "editor" }));
  }

  return array.map((item) => {
    const claim = claims.find(
      (claim) => claim.organization_id === item.organizationId,
    );
    return { ...item, permission: claim?.role };
  });
}
