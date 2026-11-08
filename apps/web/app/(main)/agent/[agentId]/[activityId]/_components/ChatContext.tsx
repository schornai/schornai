"use client";

import { createContext, useContext, useMemo } from "react";
import type { ChatMessage } from "@schornio/aibox-database/chat/_types";
import { ExhaustiveError } from "@schornio/aibox-package-utils/ExhaustiveError";
import type { ReactNode } from "react";
import { RealtimeRoom } from "@/lib/RealtimeRoom";
import { getChat } from "@schornio/aibox-realtime/documents/chat/getChat";
import { getChatDocumentName } from "@schornio/aibox-realtime/documents/chat/_utils";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { useRealtimeArray } from "@/lib/useRealtimeArray";
import { useRealtimeMap } from "@/lib/useRealtimeMap";
import { useRealtimeTypedMap } from "@/lib/useRealtimeTypedMap";

const context = createContext<{
  provider?: ReturnType<typeof useHocuspocusProvider>;
}>({});

function HocuspocusContext({ children }: { children: ReactNode }) {
  const provider = useHocuspocusProvider();
  return <context.Provider value={{ provider }}>{children}</context.Provider>;
}

export function ChatContext({
  activityId,
  agentId,
  children,
}: {
  activityId: string;
  agentId: string;
  children?: ReactNode;
}) {
  return (
    <RealtimeRoom name={getChatDocumentName({ activityId, agentId })}>
      <HocuspocusContext>{children}</HocuspocusContext>
    </RealtimeRoom>
  );
}

function useProvider() {
  const { provider } = useContext(context);
  if (!provider) {
    const error = new Error("useProvider must be used inside a ChatContext");
    logError("ChatContext", error);
    throw new Error();
  }
  return provider;
}

export function useChatStatus() {
  const provider = useProvider();

  const chat = useMemo(() => getChat(provider.document), [provider.document]);
  const state = useRealtimeTypedMap(chat.state)?.type;
  const cancellations = useRealtimeMap(
    provider.document.getMap<boolean>("cancellations"),
  );
  if (cancellations.size) return "generating";

  // todo: files loading
  switch (state) {
    case undefined:
      return "idle";
    case "idle":
    case "queued":
    case "error":
      return state;
    case "generating":
    case "aborting":
      return "generating";
    default: {
      throw new ExhaustiveError(state);
    }
  }
}

export function useCanSendMessage() {
  const status = useChatStatus();
  return status === "idle" || status === "error";
}

export function useMessages(): ChatMessage[] {
  const provider = useProvider();

  const chat = getChat(provider.document);
  const messages = useRealtimeArray(chat.messages);

  return messages;
}

export function useChatError(): string | undefined {
  const provider = useProvider();
  const chat = useMemo(() => getChat(provider.document), [provider.document]);
  const state = useRealtimeTypedMap(chat.state);
  return state?.type === "error" ? state.error : undefined;
}
