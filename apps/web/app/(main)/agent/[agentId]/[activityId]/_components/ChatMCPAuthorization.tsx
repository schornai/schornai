"use client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { useT } from "next-i18next/client";

export function ChatMCPAuthorization({
  agentId,
  activityId,
  approvalId,
  mcpId,
  disabled,
}: {
  agentId: string;
  activityId: string;
  approvalId: string;
  mcpId: string;
  disabled?: boolean;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMCPAuthorization",
  });
  return (
    <form action="/api/mcp/oauth" method="post">
      <input type="hidden" name="agentId" value={agentId} />
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="approvalId" value={approvalId} />
      <input type="hidden" name="mcpId" value={mcpId} />
      <input
        type="hidden"
        name="returnTo"
        value={`/agent/${encodeURIComponent(agentId)}/${encodeURIComponent(activityId)}`}
      />
      <Button type="submit" size="sm" disabled={disabled}>
        {t("labelConnect")}
      </Button>
    </form>
  );
}
