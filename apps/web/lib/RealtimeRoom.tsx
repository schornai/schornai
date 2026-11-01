"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { Doc } from "yjs";
import { HocuspocusRoomContext } from "@hocuspocus/provider-react";
import type { HocuspocusRoomProps } from "@hocuspocus/provider-react";
import { createRealtimeRoomStore } from "./realtimeLifecycle";
import { useSessionToken } from "./supabase/use-session-token";
import { useRealtimeConnection } from "./RealtimeProvider";

type RealtimeRoomProps = Pick<
  HocuspocusRoomProps,
  "children" | "name" | "token"
>;

/**
 * Temporary workaround for @hocuspocus/provider-react 4.7.0 (the same code
 * remains in upstream 4.7.1, checked 2026-10-14).
 *
 * React Activity / Next.js cached navigation cleans up effects while keeping
 * component state. Upstream HocuspocusRoom destroys its provider on cleanup,
 * then reuses that instance on resume. attach() does not restore the Y.Doc
 * update listener removed by destroy(): edits remain local and disappear on
 * reload. The shared websocket component has the same resource-lifetime issue.
 * This proves a hide/show failure; the reported generation-only sequence has
 * not yet been reproduced end to end.
 *
 * RealtimeRoom + RealtimeProvider + realtimeLifecycle preserve the document
 * and child state, but recreate disposed network resources on subscription.
 * Keep sessionAwareness enabled for overlapping rooms on the same document.
 *
 * Removal: once an official Hocuspocus release fixes BOTH React lifecycles,
 * run tests/web/realtime-{room,provider}.test.tsx against the upstream
 * components (including Activity, StrictMode, overlapping rooms and reload).
 * If they pass, migrate all six room sites and both layouts back, retain
 * sessionAwareness=true at the room sites, remove these three wrapper files
 * and their ESLint import restriction, and update Storybook/test mocks.
 */
export function RealtimeRoom(props: RealtimeRoomProps) {
  return <Room key={props.name} {...props} />;
}

function Room({ children, name, token }: RealtimeRoomProps) {
  const connection = useRealtimeConnection();
  const sessionToken = useSessionToken();
  const userToken = useCallback(
    () => (sessionToken ? `User ${sessionToken}` : ""),
    [sessionToken],
  );
  const authentication = token ?? userToken;
  // Keep unsent edits when Next.js hides this route in an Activity. The doc
  // has no external resources and is collected when the room is unmounted.
  const [document] = useState(() => new Doc());
  const store = useMemo(
    () =>
      createRealtimeRoomStore({
        connection,
        document,
        name,
        token: authentication,
      }),
    [document, name, authentication, connection],
  );
  const provider = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  return provider ? (
    <HocuspocusRoomContext.Provider value={{ provider }}>
      {children}
    </HocuspocusRoomContext.Provider>
  ) : null;
}
