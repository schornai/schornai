import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@schornio/aibox-package-ui/components/alert";
import { CirclePlus, Info, UserRound } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
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
import Link from "next/link";
import { UserRoleIcon } from "../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../_components/UserRoleText";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";

export default async function Page() {
  const [{ claims, isAdmin }, { t }] = await Promise.all([
    getWorkspaceClaims(),
    getT("me", { keyPrefix: "permissions.page" }),
  ]);

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <UserRound />
          {t("title")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <ContainerTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tableColumnName")}</TableHead>
                <TableHead>{t("tableColumnPermission")}</TableHead>
                <TableHead>{t("tableColumnDescription")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {claims.length === 0 ? (
                  <TableCell colSpan={3}>
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <UserRound />
                        </EmptyMedia>
                        <EmptyTitle>{t("infoEmpty")}</EmptyTitle>
                        <EmptyDescription>
                          {t("infoEmptyDescription")}
                        </EmptyDescription>
                        {isAdmin ? (
                          <EmptyContent>
                            <p>{t("infoEmptyAdminDescription")}</p>

                            <Button
                              nativeButton={false}
                              render={
                                <Link href="/settings/workspace">
                                  <CirclePlus />
                                  {t("infoEmptyAdminAction")}
                                </Link>
                              }
                            />
                          </EmptyContent>
                        ) : undefined}
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                ) : undefined}
              </TableRow>
              {claims.map((organization) => (
                <TableRow key={organization.id}>
                  <TableCell>{organization.name}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    <UserRoleIcon role={organization.claim} />{" "}
                    <UserRoleText role={organization.claim} />
                  </TableCell>
                  <TableCell>{organization.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ContainerTable>
      </ContainerMain>

      <hr className="my-10" />

      <ContainerMain className="flex max-w-2xl flex-col gap-3">
        <h2 title="Help">
          <Info className="mx-auto" size={40} />
        </h2>
        <Alert>
          <UserRoleIcon role="user" />
          <AlertTitle>
            <UserRoleText role="user" />
          </AlertTitle>
          <AlertDescription>{t("infoUser")}</AlertDescription>
        </Alert>
        <Alert>
          <UserRoleIcon role="editor" />
          <AlertTitle>
            <UserRoleText role="editor" />
          </AlertTitle>
          <AlertDescription>{t("infoEditor")}</AlertDescription>
        </Alert>
        <Alert>
          <UserRoleIcon role="admin" />
          <AlertTitle>
            <UserRoleText role="admin" />
          </AlertTitle>
          <AlertDescription>{t("infoAdmin")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
