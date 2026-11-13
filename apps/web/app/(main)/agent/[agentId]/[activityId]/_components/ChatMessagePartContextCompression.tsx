"use client";

import { Summary } from "lucide-react";
import { useT } from "next-i18next/client";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@schornio/aibox-package-ui/components/marker";

export function ChatMessagePartContextCompression({
  part,
}: {
  part: Extract<
    ChatMessage["parts"][number],
    { type: "data-contextCompression" }
  >;
}) {
  const { state } = part.data;
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMessagePartContextCompression",
  });
  return (
    <Marker variant="separator" role="status" aria-live="polite">
      <MarkerIcon>
        <Summary />
      </MarkerIcon>
      <MarkerContent className={state === "pending" ? "shimmer" : undefined}>
        {t(`label${state[0]!.toUpperCase()}${state.slice(1)}`)}
      </MarkerContent>
    </Marker>
  );
}
