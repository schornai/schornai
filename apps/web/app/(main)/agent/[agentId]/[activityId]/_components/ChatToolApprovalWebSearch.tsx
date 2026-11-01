"use client";

import { Search } from "lucide-react";
import { useT } from "next-i18next/client";
import { ChatToolApprovalContent } from "./ChatToolApprovalContent";

export function ChatToolApprovalWebSearch({ input }: { input: unknown }) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatToolApprovalWebSearch",
  });
  const query =
    typeof input === "object" &&
    input !== null &&
    "query" in input &&
    typeof input.query === "string"
      ? input.query
      : undefined;
  return (
    <ChatToolApprovalContent
      title={t("labelTitle")}
      description={t("descriptionSearch")}
      icon={<Search />}
    >
      <p className="break-words">{query}</p>
    </ChatToolApprovalContent>
  );
}
