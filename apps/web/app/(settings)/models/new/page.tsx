import { Brain } from "lucide-react";
import { getT } from "next-i18next/server";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { notFound } from "next/navigation";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ProviderSelection } from "../_components/ProviderSelection";
export default async function Page() {
  if (!(await getWorkspaceClaims()).isAdmin) notFound();
  const { t } = await getT("settings", { keyPrefix: "models" });
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Brain />
          {t("labelChooseProvider")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <ProviderSelection />
      </ContainerMain>
    </>
  );
}
