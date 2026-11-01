"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ArrowRight, ChevronsUpDown, FolderOpen, Pencil } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function AgentInfoRoleDocumentRepository({
  documentRepositoryMounts,
  documentRepositoryMap,
  editAgentPathname,
  editDefaultRole,
  editRoleId,
}: {
  documentRepositoryMounts: Agent["roles"][number]["documentRepositoryMounts"];
  documentRepositoryMap?: Map<string | symbol, DocumentRepository>;
  editAgentPathname?: string;
  editDefaultRole?: Agent["roles"][number];
  editRoleId?: string;
}) {
  const { i18n, t } = useT("agent", {
    keyPrefix: "_components.AgentInfoRoleDocumentRepository",
  });

  const [open, setOpen] = useState(false);

  const changed =
    editRoleId &&
    composite(editDefaultRole?.documentRepositoryMounts) !==
      composite(documentRepositoryMounts);

  const mounts = documentRepositoryMounts
    ?.map((mount) => ({
      ...mount,
      documentRepository: documentRepositoryMap?.get(
        mount.documentRepositoryIdentifier,
      ),
    }))
    .toSorted((a, b) => {
      const aName = a.documentRepository?.name;
      const bName = b.documentRepository?.name;

      const diffName =
        aName && bName ? aName.localeCompare(bName, i18n.language) : 0;

      if (diffName === 0) {
        const diffDocumentId = a.documentRepositoryIdentifier.localeCompare(
          b.documentRepositoryIdentifier,
          i18n.language,
        );

        if (diffDocumentId === 0) {
          const diffMount = a.mount.localeCompare(b.mount, i18n.language);

          if (diffMount === 0) {
            return a.pathRepository.localeCompare(
              b.pathRepository,
              i18n.language,
            );
          } else {
            return diffMount;
          }
        } else {
          return diffDocumentId;
        }
      } else {
        return diffName;
      }
    });

  const mountGroups = Array.from(
    Object.entries(
      Object.groupBy(
        mounts,
        (mount) =>
          mount.documentRepository?.name ?? t("labelUnknownRepository"),
      ),
    ),
  );

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <FolderOpen />
      <Collapsible onOpenChange={setOpen} open={open}>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editRoleId ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=documentRepositoryMounts#role-${editRoleId}`}
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
            <>
              <ul>
                {mountGroups.map(([group]) => (
                  <li key={group}>
                    <strong>{group}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}
          <CollapsibleContent>
            <ul>
              {mounts.map((mount) => (
                <AgentInfoRoleDocumentRepositoryMount
                  documentRepositoryMap={documentRepositoryMap}
                  key={mount.id}
                  mount={mount}
                />
              ))}
            </ul>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}

function AgentInfoRoleDocumentRepositoryMount({
  documentRepositoryMap,
  mount,
}: {
  documentRepositoryMap?: Map<string | symbol, DocumentRepository>;
  mount: Agent["roles"][number]["documentRepositoryMounts"][number];
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoRoleDocumentRepository",
  });

  const repository = documentRepositoryMap?.get(
    mount.documentRepositoryIdentifier,
  );

  return (
    <li key={mount.id}>
      <strong>{repository?.name ?? t("labelUnknownRepository")}</strong>
      <ul className="pl-3">
        {!repository ? (
          <li className="text-destructive">
            {t("descriptionRepositoryNotFound")}
          </li>
        ) : undefined}
        <li className="flex items-center gap-1">
          <CodeInline>{mount.mount}</CodeInline>{" "}
          <ArrowRight className="size-4" />{" "}
          <CodeInline>{mount.pathRepository}</CodeInline>
        </li>
        <li>
          {mount.permission === "confirm-write"
            ? t("labelConfirmWrite")
            : undefined}
          {mount.permission === "read-only" ? t("labelReadOnly") : undefined}
          {mount.permission === "write" ? t("labelWrite") : undefined}
        </li>
        <li>
          <Button
            className="no-underline!"
            nativeButton={false}
            render={
              <Link
                href={`/app/documents/${mount.documentRepositoryIdentifier}`}
              />
            }
            size="xs"
            variant="outline"
          >
            <FolderOpen /> {t("labelGoToRepository")}
          </Button>
        </li>
      </ul>
    </li>
  );
}
