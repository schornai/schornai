import { File, Info } from "lucide-react";
import {
  TabsMainList,
  TabsMainTriggerBase,
} from "../../../../../../_components/TabsMain";
import Link from "next/link";
import { getT } from "next-i18next/server";

export async function TabsTranscription({
  activityId,
  transcriberId,
  pathSegment,
}: {
  activityId: string;
  transcriberId: string;
  pathSegment: "files" | "info";
}) {
  const { t } = await getT("transcriber", {
    keyPrefix: "_components.TabsTranscription",
  });

  return (
    <TabsMainList className="mb-6" stickyTop>
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "files"}
        nativeButton={false}
        render={
          <Link href={`/app/transcribe/${transcriberId}/${activityId}/files`}>
            <File /> {t("tabFiles")}
          </Link>
        }
      />
      <TabsMainTriggerBase
        isCurrentView={pathSegment === "info"}
        nativeButton={false}
        render={
          <Link href={`/app/transcribe/${transcriberId}/${activityId}/info`}>
            <Info /> {t("tabInfo")}
          </Link>
        }
      />
    </TabsMainList>
  );
}
