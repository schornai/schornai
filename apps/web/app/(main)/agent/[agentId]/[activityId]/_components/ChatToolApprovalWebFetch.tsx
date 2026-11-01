"use client";

import { Globe } from "lucide-react";
import { useT } from "next-i18next/client";
import { ChatToolApprovalContent } from "./ChatToolApprovalContent";

export function ChatToolApprovalWebFetch({ input }: { input: unknown }) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatToolApprovalWebFetch",
  });
  const url =
    typeof input === "object" &&
    input !== null &&
    "url" in input &&
    typeof input.url === "string"
      ? input.url
      : undefined;
  const path =
    typeof input === "object" &&
    input !== null &&
    "path" in input &&
    typeof input.path === "string"
      ? input.path
      : undefined;
  return (
    <ChatToolApprovalContent
      title={t("labelTitle")}
      description={t("descriptionFetch")}
      icon={<Globe />}
    >
      <p className="break-words">{url}</p>
      {path !== undefined && (
        <p className="wrap-anywhere">
          {t("labelDestination")}: {path}
        </p>
      )}
    </ChatToolApprovalContent>
  );
}
