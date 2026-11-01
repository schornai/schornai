"use client";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { useRealtimeMap } from "@/lib/useRealtimeMap";
import { useRealtimeRoomConnected } from "@/lib/useRealtimeRoomConnected";
import {
  servicesDocumentName,
  getMachines,
} from "@schornio/aibox-realtime/documents/services/_schema";
import type { Preferences } from "@/lib/groupSortView/types";
import { ServiceDashboard } from "./ServiceDashboard";
function Machines({ userPreferences }: { userPreferences?: Preferences }) {
  const provider = useHocuspocusProvider();
  const machines = useRealtimeMap(getMachines(provider.document));
  const connected = useRealtimeRoomConnected();
  return (
    <ServiceDashboard
      machines={[...machines.values()]}
      connected={connected}
      userPreferences={userPreferences}
    />
  );
}
export function ServiceContext({
  userPreferences,
}: {
  userPreferences?: Preferences;
}) {
  return (
    <RealtimeRoom name={servicesDocumentName}>
      <Machines userPreferences={userPreferences} />
    </RealtimeRoom>
  );
}
