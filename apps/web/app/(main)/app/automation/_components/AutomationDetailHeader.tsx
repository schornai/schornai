"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Info, History } from "lucide-react";
import { useT } from "next-i18next/client";
import type { Automation } from "@schornio/aibox-package-database/automation/_types";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import {
  TabsMainList,
  TabsMainTriggerBase,
} from "../../../../_components/TabsMain";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
export function AutomationDetailHeader({
  automation,
  view,
  options,
}: {
  automation: Automation;
  view: "info" | "runs";
  options?: ReactNode;
}) {
  const { t } = useT("automation");
  return (
    <>
      <HeaderMain appColor={automation.color}>
        <HeaderMainContent>
          <CircleChevronsRight />
          {automation.name}
        </HeaderMainContent>
        {options && <HeaderMainAsideContent>{options}</HeaderMainAsideContent>}
      </HeaderMain>
      <TabsMainList stickyTop className="mb-6">
        {(["info", "runs"] as const).map((item) => (
          <TabsMainTriggerBase
            key={item}
            isCurrentView={item === view}
            nativeButton={false}
            render={<Link href={`/app/automation/${automation.id}/${item}`} />}
          >
            {item === "info" ? <Info /> : <History />}
            {t(item === "info" ? "labelInfo" : "labelRuns")}
          </TabsMainTriggerBase>
        ))}
      </TabsMainList>
    </>
  );
}
