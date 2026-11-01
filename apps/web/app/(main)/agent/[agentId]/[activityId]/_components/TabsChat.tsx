import { File, Info, MessageSquare } from "lucide-react";
import {
  TabsMainList,
  TabsMainTriggerBase,
} from "../../../../../_components/TabsMain";
import Link from "next/link";

export function TabsChat({
  activityId,
  agentId,
  pathSegment,
}: {
  activityId: string;
  agentId: string;
  pathSegment: "chat" | "files" | "info";
}) {
  return (
    <TabsMainList className="mb-6" stickyTop>
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "chat"}
        nativeButton={false}
        render={
          <Link href={`/agent/${agentId}/${activityId}`}>
            <MessageSquare /> Chat
          </Link>
        }
      />
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "files"}
        nativeButton={false}
        render={
          <Link href={`/agent/${agentId}/${activityId}/files`}>
            <File /> Dateien
          </Link>
        }
      />
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "info"}
        nativeButton={false}
        render={
          <Link href={`/agent/${agentId}/${activityId}/info`}>
            <Info /> Info
          </Link>
        }
      />
    </TabsMainList>
  );
}
