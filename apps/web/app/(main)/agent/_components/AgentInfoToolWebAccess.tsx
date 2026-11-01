"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, Pencil, Globe } from "lucide-react";
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
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function AgentInfoToolWebAccess({
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
    keyPrefix: "_components.AgentInfoToolWebAccess",
  });

  const changed =
    editRoleId &&
    composite(editDefaultRole?.toolWebAccess) !==
      composite(agentRole?.toolWebAccess);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Globe />
      <Collapsible open={open} onOpenChange={setOpen}>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editRoleId ? (
              <Button
                aria-label={t("labelEdit")}
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=tool-web#role-${editRoleId}`}
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
                <Button
                  aria-label={t("labelDetails")}
                  size="icon-xs"
                  variant="ghost"
                >
                  <ChevronsUpDown />
                </Button>
              }
            />
          </InfoActions>
        </InfoTitle>
        <AlertDescription>
          <strong>
            {t("labelFetch")}:{" "}
            {t(
              !agentRole?.toolWebAccess?.active
                ? "labelOff"
                : `label${agentRole.toolWebAccess.webFetch === "ask" ? "Ask" : agentRole.toolWebAccess.webFetch === "on" ? "On" : "Off"}`,
            )}
          </strong>
          {" · "}
          <strong>
            {t("labelSearch")}:{" "}
            {t(
              !agentRole?.toolWebAccess?.active
                ? "labelOff"
                : `label${agentRole.toolWebAccess.webSearch === "ask" ? "Ask" : agentRole.toolWebAccess.webSearch === "on" ? "On" : "Off"}`,
            )}{" "}
            {agentRole?.toolWebAccess?.webSearchProvider === "brave"
              ? "(Brave)"
              : agentRole?.toolWebAccess?.webSearchProvider === "staan"
                ? "(Staan)"
                : ""}
          </strong>
          <CollapsibleContent className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1">
              <p>{t("descriptionFetch")}</p>
              <p>
                {t(
                  agentRole?.toolWebAccess?.webFetchAccess === "allow-list"
                    ? "labelWhitelist"
                    : "labelAll",
                )}
              </p>
              {agentRole?.toolWebAccess?.webFetchAccess === "allow-list" && (
                <p>
                  {agentRole.toolWebAccess.webFetchAllowList.join(", ") ||
                    t("labelEmptyWhitelist")}
                </p>
              )}
            </div>
            <p>{t("descriptionSearch")}</p>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
