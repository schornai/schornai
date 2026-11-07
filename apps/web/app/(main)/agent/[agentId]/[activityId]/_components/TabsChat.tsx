"use client";

import { Book, File, Info, MessageSquare } from "lucide-react";
import {
  TabsMainList,
  TabsMainTriggerBase,
} from "../../../../../_components/TabsMain";
import Link from "next/link";
import { useT } from "next-i18next/client";

export function TabsChat({
  activityId,
  agentId,
  pathSegment,
  hasDocumentation = false,
}: {
  activityId: string;
  agentId: string;
  pathSegment: "chat" | "files" | "documentation" | "info";
  hasDocumentation?: boolean;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.TabsChat" });
  return (
    <TabsMainList className="mb-6" stickyTop>
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "chat"}
        nativeButton={false}
        render={
          <Link href={`/agent/${agentId}/${activityId}`}>
            <MessageSquare /> {t("labelChat")}
          </Link>
        }
      />
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "files"}
        nativeButton={false}
        render={
          <Link href={`/agent/${agentId}/${activityId}/files`}>
            <File /> {t("labelFiles")}
          </Link>
        }
      />
      {hasDocumentation ? (
        <TabsMainTriggerBase
          isCurrentView={pathSegment === "documentation"}
          nativeButton={false}
          render={
            <Link href={`/agent/${agentId}/${activityId}/documentation`}>
              <Book /> {t("labelDocumentation")}
            </Link>
          }
        />
      ) : null}
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "info"}
        nativeButton={false}
        render={
          <Link href={`/agent/${agentId}/${activityId}/info`}>
            <Info /> {t("labelInfo")}
          </Link>
        }
      />
    </TabsMainList>
  );
}
