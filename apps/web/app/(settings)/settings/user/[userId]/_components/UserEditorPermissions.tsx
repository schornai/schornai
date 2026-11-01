import { UserEditPermissionList } from "./UserEditPermissionList";
import { UserEditPermissionListProvider } from "./UserEditPermissionListProvider";
import { UserEditorAdmin } from "./UserEditorAdmin";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getUserIsAdmin } from "@schornio/aibox-package-database/user/getUserIsAdmin";
import { getWorkspacesWithUserClaim } from "@schornio/aibox-package-database/workspace/getWorkspacesWithUserClaim";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";

export async function UserEditorPermissions({ userId }: { userId: string }) {
  const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();

  const [workspaces, groupSortViewPreferences, isAdmin] = await Promise.all([
    getWorkspacesWithUserClaim(userId, { supabaseServiceRole }),
    getGroupSortViewPreferences("/settings/user/[userId]"),
    getUserIsAdmin(userId, { supabaseServiceRole }),
  ]);
  return (
    <>
      {!isAdmin ? (
        <UserEditPermissionListProvider
          id="/settings/user/[userId]"
          userPreferences={groupSortViewPreferences}
          workspaces={workspaces}
        >
          <UserEditPermissionList userId={userId} />
        </UserEditPermissionListProvider>
      ) : null}
      <UserEditorAdmin isAdmin={isAdmin} userId={userId} />
    </>
  );
}
