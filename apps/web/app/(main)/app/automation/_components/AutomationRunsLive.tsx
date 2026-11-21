"use client";

import { useEffect, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { getAutomationRunsDocumentName } from "@schornio/aibox-package-database/automation/_realtime";
import { getAutomationRunsUpdates } from "@schornio/aibox-realtime/documents/automationRuns/_schema";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { useRealtimeMap } from "@/lib/useRealtimeMap";
import { useRealtimeRoomConnected } from "@/lib/useRealtimeRoomConnected";
import { AutomationRuns } from "./AutomationRuns";

function Updates() {
  const provider = useHocuspocusProvider();
  const updates = useRealtimeMap(getAutomationRunsUpdates(provider.document));
  const connected = useRealtimeRoomConnected();
  const revision = updates.get("revision");
  const { refresh } = useRouter();
  const { t } = useT("automation");
  useEffect(() => {
    if (connected) refresh();
  }, [connected, revision, refresh]);
  return connected ? null : (
    <ContainerMain>
      <p role="status" className="text-muted-foreground text-sm">
        {t("descriptionRunsConnecting")}
      </p>
    </ContainerMain>
  );
}

export function AutomationRunsLive(
  props: ComponentProps<typeof AutomationRuns>,
) {
  return (
    <>
      <AutomationRuns {...props} />
      <RealtimeRoom name={getAutomationRunsDocumentName(props.automation.id)}>
        <Updates />
      </RealtimeRoom>
    </>
  );
}
