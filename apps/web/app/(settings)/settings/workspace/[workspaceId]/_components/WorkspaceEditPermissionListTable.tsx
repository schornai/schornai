"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import { AvatarUser } from "@schornio/aibox-package-ui/components/avatar-user";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { UserRoleIcon } from "../../../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../../../_components/UserRoleText";
import { WorkspaceEditPermissionListTablePermissionCell } from "./WorkspaceEditPermissionListTablePermissionCell";
import { toKey } from "@/lib/groupSortView/hook";
import { useT } from "next-i18next/client";
import { useWorkspaceEditPermissionList } from "./WorkspaceEditPermissionListProvider";

export function WorkspaceEditPermissionListTable({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { group, itemGroups: userGroups } = useWorkspaceEditPermissionList();
  const { t } = useT("settings", {
    keyPrefix: "_components.WorkspaceEditPermissionListTable",
  });

  return (
    <ContainerMain>
      <ContainerTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>{t("tableColumnName")}</TableHead>
              <TableHead>{t("tableColumnEmail")}</TableHead>
              <TableHead>{t("tableColumnPermission")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userGroups.map(([groupId, userGroup]) => (
              <Fragment key={toKey(groupId)}>
                {group === "first-letter" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={4}>
                      {String(groupId)}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "permission" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={4}>
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

                {userGroup.map((user) => (
                  <TableRow key={`${toKey(groupId)}:${user.id}`}>
                    <TableCell>
                      <AvatarUser
                        avatarUrl={user.avatarUrl}
                        firstName={user.firstName}
                        lastName={user.lastName}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/settings/user/${user.id}`}>
                        {user.name}
                      </Link>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <WorkspaceEditPermissionListTablePermissionCell
                        user={user}
                        workspaceId={workspaceId}
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
