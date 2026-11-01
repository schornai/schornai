import { Brain } from "lucide-react";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { providers } from "../../providers";
import { notFound } from "next/navigation";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { externalModelProviderSchema } from "@schornio/aibox-package-database/aiModel/_schema";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ExternalModelForm } from "../../_components/ExternalModelForm";
export default async function Page({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  if (!(await getWorkspaceClaims()).isAdmin) notFound();
  const parsed = externalModelProviderSchema.safeParse((await params).provider);
  if (!parsed.success) notFound();
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Brain />
          {providers[parsed.data].name}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <ExternalModelForm provider={parsed.data} />
      </ContainerMain>
    </>
  );
}
