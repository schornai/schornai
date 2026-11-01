"use client";

import { CirclePlus, Library, Pencil } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { toKey } from "@/lib/groupSortView/hook";
import { useT } from "next-i18next/client";
import { useWorkspaceList } from "./WorkspaceListProvider";

export function WorkspaceListTable() {
  const { group, itemGroups: workspaceGroups } = useWorkspaceList();
  const { t } = useT("settings", {
    keyPrefix: "_components.WorkspaceListTable",
  });

  return (
    <ContainerMain>
      <ContainerTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableColumnName")}</TableHead>
              <TableHead>{t("tableColumnDescription")}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaceGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Library />
                      </EmptyMedia>
                      <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
                      <EmptyDescription>
                        {t("emptyDescription")}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        nativeButton={false}
                        render={<Link href={`/settings/workspace/new`} />}
                        variant="outline"
                      >
                        <CirclePlus />
                        {t("labelNewWorkspace")}
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : undefined}

            {workspaceGroups.map(([groupId, workspaceGroup]) => (
              <Fragment key={toKey(groupId)}>
                {group === "first-letter" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {String(groupId)}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {workspaceGroup.map((workspace) => (
                  <TableRow key={`${toKey(groupId)}:${workspace.id}`}>
                    <TableCell>
                      <Link href={`/settings/workspace/${workspace.id}`}>
                        {workspace.name}
                      </Link>
                    </TableCell>
                    <TableCell>{workspace.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Link href={`/settings/workspace/${workspace.id}`}>
                          <Pencil className="size-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </ContainerTable>
    </ContainerMain>
  );
}
