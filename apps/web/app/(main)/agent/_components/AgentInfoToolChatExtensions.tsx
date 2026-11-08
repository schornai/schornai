"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Pencil, ChevronsUpDown, MessageSquareQuote } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { useT } from "next-i18next/client";

export function AgentInfoToolChatExtensions({
  agentRole,
  editAgentPathname,
  editRoleId,
}: {
  agentRole?: Partial<Agent["roles"][number]>;
  editAgentPathname?: string;
  editRoleId?: string;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoToolChatExtensions",
  });

  return (
    <Alert>
      <MessageSquareQuote />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {editRoleId && (
              <Button
                aria-label={t("labelEdit")}
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=tool-chat-extensions#role-${editRoleId}`}
                  />
                }
                size="icon-xs"
                variant="ghost"
              >
                <Pencil />
              </Button>
            )}
            <CollapsibleTrigger
              render={
                <Button size="icon-xs" variant="ghost">
                  <ChevronsUpDown />
                </Button>
              }
            />
          </InfoActions>
        </InfoTitle>
        <AlertDescription>
          <strong>
            {agentRole?.toolChatAwareness
              ? [
                  agentRole.toolChatAwareness.updateChatLabel &&
                    t("labelTitleFeature"),
                  agentRole.toolChatAwareness.recommendNextMessages &&
                    t("labelSuggestionsFeature"),
                  agentRole.toolChatAwareness.currentDateTime &&
                    t("labelTimeFeature"),
                ]
                  .filter(Boolean)
                  .join(" · ") || t("labelNoFeatures")
              : t("labelFeatures")}
          </strong>
          <CollapsibleContent>
            <AlertDescription className="pt-3">
              {t("description")}
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
