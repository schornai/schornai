import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { Info, Library } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { WorkspaceList } from "./_components/WorkspaceList";
import { WorkspaceListOptionsDropdown } from "./_components/WorkspaceListOptionsDropdown";
import { WorkspaceListProvider } from "./_components/WorkspaceListProvider";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getT } from "next-i18next/server";
import { getWorkspaces } from "@schornio/aibox-package-database/workspace/getWorkspaces";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";

export default async function Page() {
  const supabaseServiceRole = await saveCreateSupabaseServiceRoleClient();

  const [workspaces, groupSortViewPreferences, { t }] = await Promise.all([
    getWorkspaces({ supabase: supabaseServiceRole }),
    getGroupSortViewPreferences("/settings/workspace"),
    getT("settings", { keyPrefix: "workspace.page" }),
  ]);

  return (
    <WorkspaceListProvider
      id="/settings/workspace"
      userPreferences={groupSortViewPreferences}
      workspaces={workspaces}
    >
      <HeaderMain>
        <HeaderMainContent>
          <Library /> {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <WorkspaceListOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      <WorkspaceList />

      <hr className="my-10" />

      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title="Help">
          <Info className="mx-auto" size={40} />
        </h2>
        <Alert>
          <Library />
          <AlertDescription>{t("helpDescription")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </WorkspaceListProvider>
  );
}
