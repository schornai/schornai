import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { CreateUser } from "../_components/CreateUser";
import { UsersRound } from "lucide-react";
import { getT } from "next-i18next/server";
import { saveCreateSupabaseServiceRoleClient } from "@/lib/supabase/saveCreateSupabaseServiceRoleClient";

import { getSystemConfigAccessMessage } from "../../../../_models/systemConfigAccessMessage";

export default async function Page() {
  await saveCreateSupabaseServiceRoleClient();
  const templates = await getSystemConfigAccessMessage();
  const { t } = await getT("settings", { keyPrefix: "_components.CreateUser" });
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <UsersRound />
          {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <CreateUser templates={templates} />
      </ContainerMain>
    </>
  );
}
