import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { UserList } from "./_components/UserList";
import { UserListOptionsDropdown } from "./_components/UserListOptionsDropdown";
import { UserListProvider } from "./_components/UserListProvider";
import { UsersRound } from "lucide-react";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getT } from "next-i18next/server";
import { getUsers } from "@schornio/aibox-package-database/user/getUsers";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";

export default async function Page() {
  const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();

  const [users, groupSortViewPreferences, { t }] = await Promise.all([
    getUsers({ supabaseServiceRole }),
    getGroupSortViewPreferences("/settings/user"),
    getT("settings", { keyPrefix: "users.page" }),
  ]);

  return (
    <UserListProvider
      id="/settings/user"
      users={users}
      userPreferences={groupSortViewPreferences}
    >
      <HeaderMain>
          <HeaderMainContent>
            <UsersRound /> {t("labelTitle")}
          </HeaderMainContent>
        <HeaderMainAsideContent>
          <UserListOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      <UserList />
    </UserListProvider>
  );
}
