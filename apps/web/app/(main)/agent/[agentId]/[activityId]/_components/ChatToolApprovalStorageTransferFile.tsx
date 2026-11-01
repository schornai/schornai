"use client";
import { Copy, FolderInput } from "lucide-react";
import { useT } from "next-i18next/client";
import { ChatToolApprovalContent } from "./ChatToolApprovalContent";
export function ChatToolApprovalStorageTransferFile({
  input,
  move,
}: {
  input: unknown;
  move: boolean;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatToolApprovalStorageTransferFile",
  });
  const paths =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};
  return (
    <ChatToolApprovalContent
      title={t(move ? "labelMove" : "labelCopy")}
      description={t(move ? "descriptionMove" : "descriptionCopy")}
      icon={
        move ? <FolderInput className="size-4" /> : <Copy className="size-4" />
      }
    >
      <dl className="space-y-1 text-sm break-all">
        <dt>{t("labelSource")}</dt>
        <dd>{typeof paths.fromPath === "string" ? paths.fromPath : "—"}</dd>
        <dt>{t("labelTarget")}</dt>
        <dd>{typeof paths.toPath === "string" ? paths.toPath : "—"}</dd>
      </dl>
    </ChatToolApprovalContent>
  );
}
