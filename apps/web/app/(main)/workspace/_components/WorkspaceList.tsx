"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { Library, Search } from "lucide-react";
import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
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
import { Fragment } from "react";
import Link from "next/link";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { UserRoleIcon } from "../../../_components/UserRoleIcon";
import { UserRoleText } from "../../../_components/UserRoleText";
import { WorkspaceCard } from "./WorkspaceCard";
import { WorkspaceIconGroupActions } from "./WorkspaceIconGroupActions";
import { useT } from "next-i18next/client";
import { useWorkspaceList } from "./WorkspaceListProvider";

export function WorkspaceList({ favorites }: { favorites: SettingFavorites }) {
  const { filter, setFilter, view, group, itemGroups } = useWorkspaceList();
  const { t } = useT("workspace", { keyPrefix: "_components.WorkspaceList" });
  const groupLabel = (groupId: string | symbol) =>
    group === "favorite"
      ? t(groupId === NO_GROUP_KEY ? "labelOtherWorkspaces" : "labelFavorites")
      : String(groupId);
  const showGroups = group === "favorite" || group === "first-letter";

  return (
    <>
      <ContainerMain className="flex justify-center">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            aria-label={t("labelSearch")}
            placeholder={t("labelSearch")}
            value={filter ?? ""}
            onChange={(event) => setFilter(event.currentTarget.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </ContainerMain>
      <ContainerMain>
        {itemGroups.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Library />
              </EmptyMedia>
              <EmptyTitle>
                {t(filter ? "labelNoResults" : "labelEmpty")}
              </EmptyTitle>
              <EmptyDescription>
                {t(filter ? "descriptionNoResults" : "descriptionEmpty")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : view === "table" ? (
          <ContainerTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("labelName")}</TableHead>
                  <TableHead>{t("labelDescription")}</TableHead>
                  <TableHead>{t("labelRole")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("labelActions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemGroups.map(([groupId, workspaces]) => (
                  <Fragment key={toKey(groupId)}>
                    {showGroups ? (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted font-medium">
                          {groupLabel(groupId)}
                        </TableCell>
                      </TableRow>
                    ) : undefined}
                    {workspaces.map((workspace) => (
                      <TableRow key={workspace.id}>
                        <TableCell>
                          <Link href={`/workspace/${workspace.id}`}>
                            {workspace.name}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-sm whitespace-normal">
                          {workspace.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserRoleIcon
                              className="size-4 shrink-0"
                              role={workspace.claim}
                            />
                            <UserRoleText role={workspace.claim} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <WorkspaceIconGroupActions
                              favorites={favorites}
                              workspace={workspace}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </ContainerTable>
        ) : (
          <div className="mx-auto grid w-fit max-w-full grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {itemGroups.map(([groupId, workspaces]) => (
              <Fragment key={toKey(groupId)}>
                {showGroups ? (
                  <h2 className="text-lg font-bold lg:col-span-2 xl:col-span-3">
                    {groupLabel(groupId)}
                  </h2>
                ) : undefined}
                {workspaces.map((workspace) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    favorites={favorites}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        )}
      </ContainerMain>
    </>
  );
}
