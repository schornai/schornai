"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, Library, Pencil } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "./InfoActions";
import { InfoTitle } from "./InfoTitle";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { UserRoleIcon } from "./UserRoleIcon";
import { UserRoleText } from "./UserRoleText";
import type { WorkspaceClaim } from "../_models/getWorkspaceClaims";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useT } from "next-i18next/client";

export function InfoWorkspace({
  editPathname,
  editDefaultWorkspaceId,
  editable,
  workspace,
}: {
  editPathname?: string;
  editDefaultWorkspaceId?: string;
  editable?: boolean;
  workspace?: WorkspaceClaim;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoWorkspace",
  });

  const changed = editable && editDefaultWorkspaceId !== workspace?.id;

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Library />
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
                    href={`${editPathname ?? ""}?view=settings#workspace`}
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
          <div className="flex gap-1">
            <strong>{workspace?.name ?? t("labelUnknownWorkspace")}</strong>{" "}
            <Tooltip>
              <TooltipTrigger className="cursor-help">
                <UserRoleIcon
                  className="text-muted-foreground size-4"
                  role={workspace?.claim}
                />
              </TooltipTrigger>
              <TooltipContent>
                <UserRoleText role={workspace?.claim} />
              </TooltipContent>
            </Tooltip>
          </div>
          <CollapsibleContent>
            <AlertDescription>
              {workspace?.description &&
              workspace.description.trim().length > 0 ? (
                <MarkdownProse className="max-w-none">
                  {workspace?.description}
                </MarkdownProse>
              ) : undefined}

              <Button
                className="no-underline!"
                nativeButton={false}
                render={<Link href={`/workspace/${workspace?.id}`} />}
                size="xs"
                variant="outline"
              >
                <Library /> {t("labelGoToWorkspace")}
              </Button>
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
