"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { UserEditPermissionListTablePermissionCell } from "./UserEditPermissionListTablePermissionCell";
import { UserRoleIcon } from "../../../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../../../_components/UserRoleText";
import { toKey } from "@/lib/groupSortView/hook";
import { useT } from "next-i18next/client";
import { useUserEditPermissionList } from "./UserEditPermissionListProvider";

export function UserEditPermissionListTable({ userId }: { userId: string }) {
  const { group, itemGroups: workspaceGroups } = useUserEditPermissionList();
  const { t } = useT("settings", {
    keyPrefix: "_components.UserEditPermissionListTable",
  });

  return (
    <ContainerMain>
      <ContainerTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tableColumnName")}</TableHead>
              <TableHead>{t("tableColumnDescription")}</TableHead>
              <TableHead>{t("tableColumnPermission")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaceGroups.map(([groupId, workspaceGroup]) => (
              <Fragment key={toKey(groupId)}>
                {group === "first-letter" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      {String(groupId)}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "permission" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={3}>
                      <div className="flex items-center gap-1">
                        <UserRoleIcon
                          className="size-4"
                          role={String(groupId)}
                        />{" "}
                        <UserRoleText role={String(groupId)} />
                      </div>
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
                      <UserEditPermissionListTablePermissionCell
                        userId={userId}
                        workspace={workspace}
                      />
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
