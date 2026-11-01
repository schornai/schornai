"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, Lightbulb, Pencil } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentRecommendedMessage } from "./AgentRecommendedMessage";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useT } from "next-i18next/client";

export function AgentInfoRecommendedMessages({
  agent,
  editAgentPathname,
  editDefaultAgent,
  editable,
}: {
  agent?: Partial<Agent>;
  editAgentPathname?: string;
  editDefaultAgent?: Partial<Agent>;
  editable?: boolean;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoRecommendedMessages",
  });

  const changed =
    editable &&
    composite(editDefaultAgent?.recommendedMessages) !==
      composite(agent?.recommendedMessages);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Lightbulb />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editable ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=docs#recommendedMessages`}
                  />
                }
                size="icon-xs"
                variant="ghost"
              >
                <Pencil />
              </Button>
            ) : undefined}

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
          <CollapsibleContent>
            <AlertDescription className="text-foreground flex flex-col gap-1 pt-3">
              {agent?.recommendedMessages?.map((recommendedMessage) => (
                <AgentRecommendedMessage
                  agent={agent}
                  key={recommendedMessage.id}
                  recommendedMessage={recommendedMessage}
                />
              ))}
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
