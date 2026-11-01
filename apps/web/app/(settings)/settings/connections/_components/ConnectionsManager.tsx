"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { useT } from "next-i18next/client";
import {
  Plug,
  Pencil,
  X,
  XCircle,
  CirclePlus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { ConnectionMetadata } from "@schornio/aibox-package-database/connections/_types";
import { useAction } from "next-safe-action/hooks";
import { deleteConnection } from "../_actions/deleteConnection";
import {
  NO_GROUP_KEY,
  toKey,
  useGroupSortView,
  type GroupSortFunctions,
} from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import { useFilter } from "@/lib/useFilter";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { FieldError } from "@schornio/aibox-package-ui/components/field";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@schornio/aibox-package-ui/components/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@schornio/aibox-package-ui/components/empty";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@schornio/aibox-package-ui/components/alert-dialog";
import { AlertDialogMediaDestructive } from "@schornio/aibox-package-ui/components/alert-dialog-media-destructive";
const functions: GroupSortFunctions<
  ConnectionMetadata,
  "kind" | "first-letter",
  "name"
> = {
  group(group, connection) {
    switch (group) {
      case "kind":
        return connection.kind === "oauth" ? "oauth" : "web-search";
      case "first-letter":
        return connection.name.trim().charAt(0).toLocaleUpperCase();
      default:
        return NO_GROUP_KEY;
    }
  },
  groupSort: (_group, a, b) => a.localeCompare(b),
  sort: (_sort, a, b) => a.name.localeCompare(b.name),
};
const defaults = { group: "no-group", sort: "name:asc", view: "table" };
export function ConnectionsManager({
  initialConnections,
  userPreferences,
}: {
  initialConnections: ConnectionMetadata[];
  userPreferences?: Preferences;
}) {
  const { t } = useT("settings", { keyPrefix: "connections" });
  const connections = initialConnections;
  const { filter, setFilter, filteredData } = useFilter(connections, {
    keys: ["name", "kind", "client_id", "market"],
  });
  const list = useGroupSortView<
    ConnectionMetadata,
    "kind" | "first-letter",
    "name",
    "table"
  >(
    "/settings/connections",
    filteredData,
    functions,
    userPreferences,
    defaults,
  );
  const [removing, setRemoving] = useState<ConnectionMetadata | null>(null);
  const {
    execute,
    isPending: pending,
    hasErrored: error,
    reset,
  } = useAction(deleteConnection, {
    onSuccess() {
      setRemoving(null);
    },
  });
  function remove() {
    if (removing && !pending) execute({ id: removing.id });
  }
  const newLink = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href="/settings/connections/new" />}
    >
      <CirclePlus data-icon="inline-start" />
      {t("labelAdd")}
    </Button>
  );
  const actions = (connection: ConnectionMetadata) => (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("labelEdit")}
        title={t("labelEdit")}
        nativeButton={false}
        render={<Link href={`/settings/connections/${connection.id}`} />}
      >
        <Pencil />
      </Button>
      <Button
        variant="destructive"
        size="icon-sm"
        aria-label={t("labelDelete")}
        title={t("labelDelete")}
        disabled={pending}
        onClick={() => {
          setRemoving(connection);
          reset();
        }}
      >
        <X />
      </Button>
    </div>
  );
  const groupLabel = (id: string | symbol) =>
    id === NO_GROUP_KEY
      ? t("labelNoGroup")
      : list.group === "kind"
        ? t(id === "oauth" ? "labelGroupOAuth" : "labelGroupWebSearch")
        : String(id);
  const empty = (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Plug />
        </EmptyMedia>
        <EmptyTitle>
          {t(connections.length ? "labelNoResults" : "labelEmpty")}
        </EmptyTitle>
        <EmptyDescription>
          {t(connections.length ? "descriptionNoResults" : "descriptionEmpty")}
        </EmptyDescription>
        <EmptyContent>
          {connections.length ? (
            <Button variant="outline" onClick={() => setFilter("")}>
              {t("labelClearSearch")}
            </Button>
          ) : (
            newLink
          )}
        </EmptyContent>
      </EmptyHeader>
    </Empty>
  );
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Plug />
          {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" />}>
              <SlidersHorizontal />
              {t("labelOptions")}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("labelView")}</DropdownMenuLabel>
                {[
                  {
                    key: "labelSort",
                    value: list.sort,
                    change: list.setSort,
                    items: [
                      ["name:asc", "labelNameAsc"],
                      ["name:desc", "labelNameDesc"],
                    ],
                  },
                  {
                    key: "labelGroup",
                    value: list.group,
                    change: list.setGroup,
                    items: [
                      ["no-group", "labelNoGroup"],
                      ["kind", "labelKind"],
                      ["first-letter", "labelFirstLetter"],
                    ],
                  },
                ].map((menu) => (
                  <DropdownMenuSub key={menu.key}>
                    <DropdownMenuSubTrigger>
                      {t(menu.key)}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                          value={menu.value ?? ""}
                          onValueChange={menu.change}
                        >
                          {menu.items.map(([value, label]) => (
                            <DropdownMenuRadioItem key={value} value={value!}>
                              {t(label!)}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                ))}
                {!list.isUserPreferences && (
                  <div className="flex flex-col gap-1 py-1">
                    <ButtonAction
                      size="xs"
                      hasErrored={list.savePreferencesHasErrored}
                      hasSucceeded={list.savePreferencesHasSucceeded}
                      isPending={list.savePreferencesIsPending}
                      onClick={list.savePreferences}
                    >
                      {t("labelSaveView")}
                    </ButtonAction>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={list.resetPreferences}
                    >
                      {t("labelReset")}
                    </Button>
                  </div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={<Link href="/settings/connections/new" />}
                >
                  <CirclePlus />
                  {t("labelAdd")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </HeaderMainAsideContent>
      </HeaderMain>
      {!!connections.length && (
        <ContainerMain className="flex justify-center">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              aria-label={t("labelSearch")}
              placeholder={t("labelSearch")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </ContainerMain>
      )}
      <ContainerMain>
        {!connections.length ? (
          empty
        ) : (
          <ContainerTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("labelName")}</TableHead>
                  <TableHead>{t("labelKind")}</TableHead>
                  <TableHead className="text-right">
                    {t("labelActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!list.itemGroups.length && (
                  <TableRow>
                    <TableCell colSpan={3}>{empty}</TableCell>
                  </TableRow>
                )}
                {list.itemGroups.map(([id, items]) => (
                  <Fragment key={toKey(id)}>
                    {list.group !== "no-group" && (
                      <TableRow>
                        <TableCell colSpan={3} className="bg-muted font-medium">
                          {groupLabel(id)}
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((connection) => (
                      <TableRow key={connection.id}>
                        <TableCell>
                          <Link href={`/settings/connections/${connection.id}`}>
                            {connection.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {t(`labelType_${connection.kind}`)}
                        </TableCell>
                        <TableCell>{actions(connection)}</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </ContainerTable>
        )}
      </ContainerMain>
      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !pending) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMediaDestructive>
              <XCircle />
            </AlertDialogMediaDestructive>
            <AlertDialogTitle>{t("labelDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("descriptionDelete", { name: removing?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <FieldError>{t("errorDelete")}</FieldError>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {t("labelCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {t("labelDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
