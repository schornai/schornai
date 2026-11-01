import { Suspense } from "react";
import { Skeleton } from "@schornio/aibox-package-ui/components/skeleton";
import { Plug } from "lucide-react";
import { getT } from "next-i18next/server";
import { notFound } from "next/navigation";
import { getWorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ConnectionForm } from "../../_components/ConnectionForm";
async function Content({ params }: { params: Promise<{ kind: string }> }) {
  if (!(await getWorkspaceClaims()).isAdmin) notFound();
  const { kind } = await params;
  if (kind !== "oauth" && kind !== "brave" && kind !== "staan") notFound();
  const { t } = await getT("settings", { keyPrefix: "connections" });
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Plug />
          {t(`labelType_${kind}`)}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <ConnectionForm key={kind} kind={kind} />
      </ContainerMain>
    </>
  );
}

export default function Page(props: { params: Promise<{ kind: string }> }) {
  return (
    <Suspense
      fallback={
        <ContainerMain>
          <Skeleton className="h-40 w-full" />
        </ContainerMain>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
