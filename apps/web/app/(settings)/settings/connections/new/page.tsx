import { Suspense } from "react";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { Plug } from "lucide-react";
import { getT } from "next-i18next/server";
import { notFound } from "next/navigation";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ConnectionTypeSelection } from "../_components/ConnectionTypeSelection";
async function Content() {
  if (!(await getWorkspaceClaims()).isAdmin) notFound();
  const { t } = await getT("settings", { keyPrefix: "connections" });
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Plug />
          {t("labelChooseType")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <ConnectionTypeSelection />
      </ContainerMain>
    </>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <ContainerMain>
          <Skeleton className="h-40 w-full" />
        </ContainerMain>
      }
    >
      <Content />
    </Suspense>
  );
}
