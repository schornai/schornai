import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { Library } from "lucide-react";
import { WorkspaceCreator } from "../_components/WorkspaceCreator";
import { getT } from "next-i18next/server";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";

export default async function Page() {
  await saveCreateSupabaseServiceRoleClient();
  const { t } = await getT("workspace", { keyPrefix: "new.page" });

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Library /> {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      <WorkspaceCreator />
    </>
  );
}
