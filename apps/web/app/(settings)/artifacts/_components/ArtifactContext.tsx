"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { useRealtimeArray } from "@/lib/useRealtimeArray";
import { useRealtimeRoomConnected } from "@/lib/useRealtimeRoomConnected";
import {
  applyArtifactLog,
  artifactCatalogDocumentName,
  getArtifactLog,
} from "@schornio/aibox-realtime/documents/artifactCatalog/_utils";
import type { Artifact } from "@schornio/aibox-package-database/xrag/_schema";
import type { Preferences } from "@/lib/groupSortView/types";
import { ArtifactDashboard } from "./ArtifactDashboard";
type Props = { artifacts: Artifact[]; userPreferences?: Preferences };
function Catalog({ artifacts, userPreferences }: Props) {
  const provider = useHocuspocusProvider();
  const log = useRealtimeArray(getArtifactLog(provider.document));
  const connected = useRealtimeRoomConnected();
  const router = useRouter();
  useEffect(() => {
    // Missed or compacted entries are reconciled with the authoritative Storage snapshot.
    let syncedOnce = provider.isSynced;
    const refresh = () => {
      if (syncedOnce) router.refresh();
      syncedOnce = true;
    };
    provider.on("synced", refresh);
    return () => {
      provider.off("synced", refresh);
    };
  }, [provider, router]);
  return (
    <ArtifactDashboard
      artifacts={applyArtifactLog(artifacts, log)}
      connected={connected}
      userPreferences={userPreferences}
    />
  );
}
export function ArtifactContext(props: Props) {
  return (
    <RealtimeRoom name={artifactCatalogDocumentName}>
      <Catalog {...props} />
    </RealtimeRoom>
  );
}
