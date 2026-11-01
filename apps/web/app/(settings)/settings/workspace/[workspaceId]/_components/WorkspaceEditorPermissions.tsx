import { WorkspaceEditPermissionList } from "./WorkspaceEditPermissionList";
import { WorkspaceEditPermissionListProvider } from "./WorkspaceEditPermissionListProvider";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getUsersWithWorkspaceClaim } from "@schornio/aibox-package-database/user/getUsersWithWorkspaceClaim";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";

export async function WorkspaceEditorPermissions({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();

  const [users, groupSortViewPreferences] = await Promise.all([
    getUsersWithWorkspaceClaim(workspaceId, { supabaseServiceRole }),
    getGroupSortViewPreferences("/settings/workspace/[workspaceId]"),
  ]);
  return (
    <WorkspaceEditPermissionListProvider
      id="/settings/workspace/[workspaceId]"
      userPreferences={groupSortViewPreferences}
      users={users
        .map((user) => ({
          ...user,
          workspaceRole:
            user.workspaceRole && user.workspaceRole !== "admin"
              ? user.workspaceRole
              : ("none" as const),
        }))
        .filter((user) => user.signInMethod === "email")}
    >
      <WorkspaceEditPermissionList workspaceId={workspaceId} />
    </WorkspaceEditPermissionListProvider>
  );
}
