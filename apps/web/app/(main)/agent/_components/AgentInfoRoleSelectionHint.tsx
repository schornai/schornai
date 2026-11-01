"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, MessageSquareMore, Pencil, Type } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function AgentInfoRoleSelectionHint({
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
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoRoleSelectionHint",
  });

  const [format, setFormat] = useState<"plain" | "markdown">("markdown");

  const changed =
    editRoleId &&
    composite(editDefaultRole?.roleSelectionHint) !==
      composite(agentRole?.roleSelectionHint);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <MessageSquareMore />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
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
            {editRoleId ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=settings#role-${editRoleId}-role-name`}
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
            {format === "markdown" ? (
              <MarkdownProse className="max-w-none">
                {agentRole?.roleSelectionHint}
              </MarkdownProse>
            ) : undefined}
            {format === "plain" ? (
              <pre className="text-wrap">{agentRole?.roleSelectionHint}</pre>
            ) : undefined}
          </AlertDescription>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
  );
}
