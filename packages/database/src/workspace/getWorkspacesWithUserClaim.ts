import type { Role, Workspace } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getWorkspaces } from "./getWorkspaces.ts";

export async function getWorkspacesWithUserClaim(
  userId: string,
  {
    supabaseServiceRole,
  }: {
    supabaseServiceRole: SupabaseClient;
  },
) {
  const workspaces = await getWorkspaces({ supabase: supabaseServiceRole });

  const { data } = await supabaseServiceRole
    .from("user_roles")
    .select()
    .eq("user_id", userId)
    .throwOnError();

  const workspacesWithUserClaim: (Workspace & {
    userRole: Exclude<Role, "admin"> | "none";
  })[] = workspaces.map((workspace) => {
    const userRole = data.find(
      (role) => role.organization_id === workspace.id,
    )?.role;
    return {
      ...workspace,
      userRole: !userRole || userRole === "admin" ? "none" : userRole,
    };
  });

  return workspacesWithUserClaim;
}
