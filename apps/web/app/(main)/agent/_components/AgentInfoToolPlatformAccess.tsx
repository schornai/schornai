"use client";
import { getPlatformApprovals } from "@schornio/aibox-package-database/mcp/platformAgentPolicy";
import { platformAccessLevels } from "@schornio/aibox-package-database/mcp/platformAccess";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, DraftingCompass, Pencil } from "lucide-react";
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
import { useT } from "next-i18next/client";

export function AgentInfoToolPlatformAccess({
  agentRole,
  editAgentPathname,
  editRoleId,
}: {
  agentRole?: Partial<Agent["roles"][number]>;
  editAgentPathname?: string;
  editRoleId?: string;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoToolPlatformAccess",
  });

  return (
    <Alert>
      <DraftingCompass />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            <strong>{agentRole?.name}</strong>
            {editRoleId && (
              <Button
                aria-label={t("labelEdit")}
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=tool-platform#role-${editRoleId}`}
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
          <CollapsibleContent>
            <AlertDescription className="pt-3">
              <dl className="grid grid-cols-2 gap-2">
                {platformAccessLevels.map((level) => (
                  <div className="contents" key={level}>
                    <dt>{t(`level.${level}`)}</dt>
                    <dd>
                      {t(
                        `mode.${getPlatformApprovals(agentRole?.toolPlatformAccess)[level]}`,
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>{t("descriptionPermissions")}</p>
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
