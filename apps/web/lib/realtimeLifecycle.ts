import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from "@hocuspocus/provider";
import type { Doc } from "yjs";
import type { HocuspocusRoomProps } from "@hocuspocus/provider-react";

export function createRealtimeConnection({
  url,
  websocketProvider: externalProvider,
}: {
  url?: string;
  websocketProvider?: HocuspocusProviderWebsocket;
}) {
  let current: HocuspocusProviderWebsocket | undefined;
  let users = 0;
  let destroyTimeout: ReturnType<typeof setTimeout> | undefined;

  return {
    acquire() {
      // StrictMode immediately resubscribes. Reuse the socket in that case,
      // but never reuse one whose deferred destruction has already run.
      clearTimeout(destroyTimeout);
      destroyTimeout = undefined;
      const websocketProvider =
        current ??
        externalProvider ??
        new HocuspocusProviderWebsocket({ url: url! });
      current = websocketProvider;
      users++;
      let released = false;

      return {
        release() {
          if (released) return;
          released = true;
          if (--users === 0) {
            destroyTimeout = setTimeout(() => {
              current = undefined;
              if (!externalProvider) websocketProvider.destroy();
            }, 0);
          }
        },
        websocketProvider,
      };
    },
  };
}

export function createRealtimeRoomStore({
  connection,
  document,
  name,
  token,
}: Pick<HocuspocusRoomProps, "name" | "token"> & {
  connection: ReturnType<typeof createRealtimeConnection>;
  document: Doc;
}) {
  let snapshot: HocuspocusProvider | undefined;
  let dispose: (() => void) | undefined;
  const listeners = new Set<() => void>();

  return {
    getServerSnapshot: () => undefined,
    getSnapshot: () => snapshot,
    subscribe: (onChange: () => void) => {
      if (!dispose) {
        const lease = connection.acquire();
        let provider: HocuspocusProvider | undefined;
        try {
          provider = new HocuspocusProvider({
            document,
            name,
            // Cached routes and the sidebar may observe the same document on
            // one socket. Disposing one room must not close another's session.
            sessionAwareness: true,
            token,
            websocketProvider: lease.websocketProvider,
          });
          provider.attach();
        } catch (error) {
          try {
            provider?.destroy();
          } finally {
            lease.release();
          }
          throw error;
        }
        snapshot = provider;
        const activeProvider = provider;
        dispose = () => {
          try {
            activeProvider.destroy();
          } finally {
            lease.release();
          }
        };
      }
      listeners.add(onChange);
      onChange();

      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          dispose?.();
          dispose = undefined;
          // Keep the last snapshot while hidden. Clearing it would briefly
          // render null on reactivation and erase the children's React state.
          // subscribe always supplies a fresh provider before further edits.
        }
      };
    },
  };
}
