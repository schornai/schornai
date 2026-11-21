"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PackageOpen, FileInput, FileOutput } from "lucide-react";
import { useT } from "next-i18next/client";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  TabsMainList,
  TabsMainTriggerBase,
} from "../../../../_components/TabsMain";
export function XRAGImportExport({
  tab,
  options,
  children,
}: {
  tab: "import" | "export";
  options?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGTransfer" });
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <PackageOpen />
          {t("labelTitle")}
        </HeaderMainContent>
        {options && <HeaderMainAsideContent>{options}</HeaderMainAsideContent>}
      </HeaderMain>
      <TabsMainList stickyTop className="mb-6">
        {(["import", "export"] as const).map((item) => (
          <TabsMainTriggerBase
            key={item}
            isCurrentView={tab === item}
            aria-current={tab === item ? "page" : undefined}
            nativeButton={false}
            role="link"
            render={<Link href={`/app/xrag/${item}`} />}
          >
            {item === "import" ? <FileInput /> : <FileOutput />}
            {t(item === "import" ? "labelTabImport" : "labelTabExport")}
          </TabsMainTriggerBase>
        ))}
      </TabsMainList>
      <ContainerMain>{children}</ContainerMain>
    </>
  );
}
