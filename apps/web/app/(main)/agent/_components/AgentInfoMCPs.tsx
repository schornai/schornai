"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, Pencil, Plug } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import { Fragment } from "react/jsx-runtime";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function AgentInfoMCPs({
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
  const [open, setOpen] = useState(false);
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoMCPs",
  });

  const changed =
    editRoleId &&
    composite(editDefaultRole?.mcps) !== composite(agentRole?.mcps);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Plug />
      <Collapsible open={open} onOpenChange={setOpen}>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("changedBadge")}</Badge> : undefined}

            {editRoleId ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=mcps#role-${editRoleId}`}
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
          {open ? undefined : (
            <strong>
              {agentRole?.mcps?.map((mcp, index) => (
                <Fragment key={mcp.id}>
                  <span className="inline-block">
                    {mcp.name ??
                      trySync(() => new URL(mcp.url).host).data ??
                      t("unknownMcp")}
                    {index + 1 < (agentRole?.mcps?.length ?? 0)
                      ? ","
                      : undefined}
                  </span>{" "}
                </Fragment>
              ))}
            </strong>
          )}
          <CollapsibleContent>
            <ul>
              {agentRole?.mcps?.map((mcp) => (
                <Fragment key={mcp.id}>
                  <li>
                    <strong>
                      {mcp.name ??
                        trySync(() => new URL(mcp.url).host).data ??
                        t("unknownMcp")}
                    </strong>
                    <p className="mb-0!">
                      <CodeInline>{mcp.url}</CodeInline>
                    </p>
                    {trySync(() => new URL(mcp.url).href).data ? undefined : (
                      <span className="text-destructive">
                        {t("invalidUrl")}
                      </span>
                    )}
                  </li>
                </Fragment>
              ))}
            </ul>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
