import type { Role } from "../workspace/_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { User } from "./_types.ts";
import { mapUser } from "./_mapper.ts";

/** Lists the global account directory. The caller must authorize a global admin. */
export async function getUsersWithWorkspaceClaim(
  workspaceId: string,
  {
    supabaseServiceRole,
  }: {
    supabaseServiceRole: SupabaseClient;
  },
) {
  const dbUsers = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseServiceRole.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    dbUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const [{ data: dbUserProfiles }, { data: dbUserRoles }] = await Promise.all([
    supabaseServiceRole.from("user_profiles").select().throwOnError(),
    supabaseServiceRole
      .from("user_roles")
      .select()
      .eq("organization_id", workspaceId)
      .throwOnError(),
  ]);

  const users: (User & { workspaceRole?: Role })[] = [];

  for (const dbUser of dbUsers) {
    const dbUserProfile = dbUserProfiles?.find(
      (profile) => profile.id === dbUser.id,
    );

    const workspaceRole = dbUserRoles.find(
      (role) => role.user_id === dbUser.id,
    )?.role;

    users.push({ ...mapUser(dbUser, dbUserProfile), workspaceRole });
  }

  return users;
}
