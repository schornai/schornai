"use client";
import { useEffect, useState } from "react";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";

export function useRealtimeRoomConnected() {
  const provider = useHocuspocusProvider();
  const [connected, setConnected] = useState(provider.isSynced);
  useEffect(() => {
    const update = ({ status }: { status: string }) =>
      setConnected(status === "connected" && provider.isSynced);
    const synced = ({ state }: { state: boolean }) => setConnected(state);
    provider.on("status", update);
    provider.on("synced", synced);
    setConnected(provider.isSynced);
    return () => {
      provider.off("status", update);
      provider.off("synced", synced);
    };
  }, [provider]);
  return connected;
}
