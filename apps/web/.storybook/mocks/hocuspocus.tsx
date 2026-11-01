import type { ReactNode } from "react";
import { Doc } from "yjs";
import { fn } from "storybook/test";

let document = new Doc();
export function resetRealtimeDocument() {
  document.destroy();
  document = new Doc();
}
export function HocuspocusRoom({ children }: { children?: ReactNode }) {
  return children;
}
export const HocuspocusProviderWebsocketComponent = HocuspocusRoom;
export const RealtimeRoom = HocuspocusRoom;
export const RealtimeProvider = HocuspocusRoom;
export function useHocuspocusProvider() {
  return {
    document,
    awareness: {
      getStates: () => new Map(),
      setLocalStateField: fn(),
      on: fn(),
      off: fn(),
    },
    synced: true,
    isSynced: true,
    on: fn(),
    off: fn(),
    sendStateless: fn(),
    attach: fn(),
    detach: fn(),
  };
}
