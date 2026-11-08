"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { useRealtimeArray } from "@/lib/useRealtimeArray";
import { useRealtimeRoomConnected } from "@/lib/useRealtimeRoomConnected";
import {
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
  const { refresh: refreshPage } = useRouter();
  const latestChange = log.at(-1)?.id;
  useEffect(() => {
    // Events invalidate the SQL snapshot; replayed history is not a catalog.
    if (latestChange) refreshPage();
  }, [latestChange, refreshPage]);
  useEffect(() => {
    // Reconcile missed or compacted events with the authoritative SQL snapshot.
    let syncedOnce = provider.isSynced;
    const refresh = () => {
      if (syncedOnce) refreshPage();
      syncedOnce = true;
    };
    provider.on("synced", refresh);
    return () => {
      provider.off("synced", refresh);
    };
  }, [provider, refreshPage]);
  return (
    <ArtifactDashboard
      artifacts={artifacts}
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
