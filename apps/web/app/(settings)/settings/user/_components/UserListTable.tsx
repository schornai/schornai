"use client";

import { Building2, KeyRound, Pencil } from "lucide-react";
import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
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
import { useT } from "next-i18next/client";
import { useUserList } from "./UserListProvider";

export function UserListTable() {
  const { group, itemGroups: userGroups } = useUserList();
  const { i18n, t } = useT("settings", {
    keyPrefix: "_components.UserListTable",
  });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "medium",
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
                <TableHead>{t("tableColumnMethod")}</TableHead>
                <TableHead className="text-right">{t("tableColumnLastSignIn")}</TableHead>
              <></>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userGroups.map(([groupId, userGroup]) => (
              <Fragment key={toKey(groupId)}>
                {group === "first-letter" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={6}>
                      {String(groupId)}
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "sign-in-method" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={6}>
                      <span className="flex items-center gap-1">
                         {groupId === "email" ? (
                           <>
                             <KeyRound className="size-4" />
                             {t("signInMethodEmail")}
                           </>
                         ) : undefined}
                         {groupId === "sso" ? (
                           <>
                             <Building2 className="size-4" />
                             {t("signInMethodSso")}
                           </>
                         ) : undefined}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : undefined}

                {group === "last-login" ? (
                  <TableRow>
                    <TableCell className="bg-muted font-medium" colSpan={6}>
                      {groupId === "today" ? t("groupTimeToday") : undefined}
                      {groupId === "last7Days"
                        ? t("groupTimeLast7Days")
                        : undefined}
                      {groupId === "last30Days"
                        ? t("groupTimeLast30Days")
                        : undefined}
                      {groupId === NO_GROUP_KEY
                        ? t("groupTimeOther")
                        : undefined}
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

                    <TableCell>
                      <Link href={`/settings/user/${user.id}`}>
                        {user.email}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <span className="flex items-center gap-1">
                         {user.signInMethod === "email" ? (
                           <>
                             <KeyRound className="size-4" />
                             {t("signInMethodEmail")}
                           </>
                         ) : undefined}
                         {user.signInMethod === "sso" ? (
                           <>
                             <Building2 className="size-4" />
                             {t("signInMethodSso")}
                           </>
                         ) : undefined}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      {user.lastSignInAt
                        ? dateFormatter.format(user.lastSignInAt)
                          : t("neverSignedIn")}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Link href={`/settings/user/${user.id}`}>
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
