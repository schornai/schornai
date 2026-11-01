"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  BotMessageSquare,
  ChevronsUpDown,
  MessageSquareDashed,
  Pencil,
  Type,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function AgentInfoPrompt({
  agentRole,
  editAgentPathname,
  editDefaultRole,
  editRoleId,
}: {
  agentRole?: Partial<Agent["roles"][number]>;
  editAgentPathname?: string;
  editDefaultRole?: Agent["roles"][number];
  editRoleId?: string;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.AgentInfoPrompt" });

  const [format, setFormat] = useState<"plain" | "markdown">("markdown");

  const changed =
    editRoleId &&
    composite(editDefaultRole?.prompt) !== composite(agentRole?.prompt);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <BotMessageSquare />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelPrompt")}
          </CollapsibleTrigger>
          <InfoActions>
            <CollapsibleContent>
              <Button
                aria-pressed={format === "markdown"}
                className={cn({ "bg-muted": format === "markdown" })}
                onClick={() =>
                  setFormat((prev) =>
                    prev === "markdown" ? "plain" : "markdown",
                  )
                }
                size="xs"
                variant="ghost"
              >
                <Type /> {t("labelMarkdown")}
              </Button>
            </CollapsibleContent>

            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editRoleId ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=prompt#role-${editRoleId}`}
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

        <CollapsibleContent>
          <AlertDescription className="pt-3">
            {(agentRole?.prompt?.trim().length ?? 0) === 0 ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquareDashed className="inline size-4" />{" "}
                {t("labelEmpty")}
              </span>
            ) : (
              <>
                {format === "markdown" ? (
                  <MarkdownProse className="max-w-none">
                    {agentRole?.prompt}
                  </MarkdownProse>
                ) : undefined}
                {format === "plain" ? (
                  <pre className="text-wrap">{agentRole?.prompt}</pre>
                ) : undefined}
              </>
            )}
          </AlertDescription>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
  );
}
