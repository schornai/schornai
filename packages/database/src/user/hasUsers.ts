import type { SupabaseClient } from "../_shared/_types.ts";

/** Server-only. The caller must authorize administration or local instance setup. */
export async function hasUsers({
  supabaseServiceRole,
}: {
  supabaseServiceRole: SupabaseClient;
}) {
  const { data, error } = await supabaseServiceRole.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (error || !data) throw new Error("INITIAL_ADMIN_CHECK_FAILED");
  return data.users.length > 0;
}
