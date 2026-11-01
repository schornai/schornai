"use client";
import { StorageViewOptionsDropdown } from "./StorageViewOptionsDropdown";

import type { ReactNode } from "react";
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
import { StorageObjectActions } from "./StorageObjectActions";
import { FileIcon } from "./FileIcon";
import { FileLabel } from "./FileLabel";
import { FileUploadDropZone } from "./FileUploadDropZone";
import { Folder } from "lucide-react";
import { Fragment } from "react/jsx-runtime";
import Link from "next/link";
import { StorageViewEmpty } from "./StorageViewEmpty";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { formatFileSize } from "@schornio/aibox-package-utils/formatFileSize";
import { useStorageView } from "./StorageViewProvider";
import { useT } from "next-i18next/client";

export function StorageViewTable() {
  const { t, i18n } = useT("common", {
    keyPrefix: "_components.StorageViewTable",
  });
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const {
    basePathApp,
    group,
    itemGroups,
    storage,
    canWrite,
    pendingFilePaths = [],
  } = useStorageView();

  return (
    <StorageViewOptionsDropdown>
      <div className="flex min-h-48 flex-1 flex-col">
        <FileUploadDropZone disabled={!canWrite}>
          <ContainerMain>
            <ContainerTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tableColumnName")}</TableHead>
                    <TableHead>{t("tableColumnType")}</TableHead>
                    <TableHead>{t("tableColumnSize")}</TableHead>
                    <TableHead>{t("tableColumnCreated")}</TableHead>
                    <TableHead>{t("tableColumnUpdated")}</TableHead>
                    <TableHead className="text-right">
                      {t("tableColumnNameActions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <StorageViewEmpty />
                      </TableCell>
                    </TableRow>
                  ) : undefined}
                  {itemGroups.map(([groupId, itemGroup]) => (
                    <Fragment key={toKey(groupId)}>
                      {group === "created" || group === "updated" ? (
                        <TableRow>
                          <TableCell
                            className="bg-muted font-medium"
                            colSpan={6}
                          >
                            {groupId === "today"
                              ? t("groupTimeToday")
                              : undefined}
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

                      {group === "first-letter" ? (
                        <TableRow>
                          <TableCell
                            className="bg-muted font-medium"
                            colSpan={6}
                          >
                            {String(groupId)}
                          </TableCell>
                        </TableRow>
                      ) : undefined}

                      {group === "type" ? (
                        <TableRow>
                          <TableCell
                            className="bg-muted font-medium"
                            colSpan={6}
                          >
                            <FileLabel path={String(groupId)} />
                          </TableCell>
                        </TableRow>
                      ) : undefined}

                      {itemGroup.map((storageObject) => {
                        const row = (actions?: ReactNode) => (
                          <TableRow
                            key={`${toKey(groupId)}:${storageObject.path}`}
                            onContextMenu={(event) => event.stopPropagation()}
                          >
                            <TableCell
                              className={cn("align-middle", {
                                "text-destructive":
                                  storageObject.currentAction?.state ===
                                  "error",
                              })}
                            >
                              <Link
                                className={cn(
                                  "inline-block max-w-sm truncate",
                                  {
                                    shimmer:
                                      storageObject.currentAction?.state ===
                                      "uploading",
                                  },
                                )}
                                href={`${basePathApp}/${storageObject.path}`}
                              >
                                <span className="flex items-center">
                                  {storageObject.file ? (
                                    <FileIcon
                                      className="mr-1 inline size-4"
                                      path={storageObject.path}
                                    />
                                  ) : undefined}
                                  {storageObject.folder ? (
                                    <Folder className="mr-1 inline size-4" />
                                  ) : undefined}
                                  {storageObject.name}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell
                              className={cn({
                                "text-destructive":
                                  storageObject.currentAction?.state ===
                                  "error",
                              })}
                            >
                              {storageObject.file ? (
                                <FileLabel path={storageObject.path} />
                              ) : (
                                <FileLabel path="folder" />
                              )}

                              {storageObject.currentAction?.state ===
                              "error" ? (
                                <> · Fehler</>
                              ) : undefined}

                              {storageObject.currentAction?.state ===
                              "processing" ? (
                                <>{t("descriptionProcessing")}</>
                              ) : undefined}
                              {storageObject.currentAction?.state ===
                              "uploading" ? (
                                <>
                                  {" "}
                                  · Datei wird hochgeladen ·{" "}
                                  {Math.floor(
                                    storageObject.currentAction.progress * 100,
                                  )}{" "}
                                  %
                                </>
                              ) : undefined}
                            </TableCell>
                            <TableCell
                              className={cn("text-right", {
                                "text-destructive":
                                  storageObject.currentAction?.state ===
                                  "error",
                              })}
                            >
                              {storageObject.currentAction?.state ===
                                "uploading" && storageObject.file ? (
                                <>
                                  {formatFileSize(
                                    storageObject.currentAction.progress *
                                      storageObject.size,
                                  )}{" "}
                                  /{" "}
                                </>
                              ) : undefined}

                              {storageObject.file
                                ? formatFileSize(storageObject.size)
                                : undefined}
                            </TableCell>
                            <TableCell
                              className={cn("tabular-nums", {
                                "text-destructive":
                                  storageObject.currentAction?.state ===
                                  "error",
                              })}
                            >
                              {storageObject.file
                                ? dateFormatter.format(
                                    new Date(storageObject.createdAtISO),
                                  )
                                : ""}
                            </TableCell>
                            <TableCell
                              className={cn("tabular-nums", {
                                "text-destructive":
                                  storageObject.currentAction?.state ===
                                  "error",
                              })}
                            >
                              {storageObject.file
                                ? dateFormatter.format(
                                    new Date(storageObject.updatedAtISO),
                                  )
                                : ""}
                            </TableCell>
                            <TableCell className="text-right">
                              {actions}
                            </TableCell>
                          </TableRow>
                        );
                        return (
                          <StorageObjectActions
                            key={storageObject.path}
                            storageObject={storageObject}
                            storage={storage}
                            canWrite={canWrite}
                            busy={pendingFilePaths.includes(storageObject.path)}
                          >
                            {row}
                          </StorageObjectActions>
                        );
                      })}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </ContainerTable>
          </ContainerMain>
        </FileUploadDropZone>
      </div>
    </StorageViewOptionsDropdown>
  );
}
