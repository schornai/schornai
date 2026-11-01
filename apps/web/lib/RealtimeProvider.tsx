"use client";

import { createContext, useContext, useMemo } from "react";
import type { HocuspocusProviderWebsocketComponentProps } from "@hocuspocus/provider-react";
import { createRealtimeConnection } from "./realtimeLifecycle";

const context = createContext<
  ReturnType<typeof createRealtimeConnection> | undefined
>(undefined);

export function RealtimeProvider({
  children,
  url,
  websocketProvider,
}: HocuspocusProviderWebsocketComponentProps) {
  // A connection belongs to the active rooms, not to a render or an effect
  // on their parent. This also handles Activity's child-first effect restart.
  const connection = useMemo(
    () => createRealtimeConnection({ url, websocketProvider }),
    [url, websocketProvider],
  );

  return <context.Provider value={connection}>{children}</context.Provider>;
}

export function useRealtimeConnection() {
  const connection = useContext(context);
  if (!connection) throw new Error("RealtimeRoom requires a RealtimeProvider");
  return connection;
}
