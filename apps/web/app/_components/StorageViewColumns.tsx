"use client";
import { StorageViewOptionsDropdown } from "./StorageViewOptionsDropdown";
import { StorageObjectActions } from "./StorageObjectActions";

import { ChevronRight, Folder } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { FileIcon } from "./FileIcon";
import { FileLabel } from "./FileLabel";
import { FileUploadDropZone } from "./FileUploadDropZone";
import Link from "next/link";
import { StorageViewEmpty } from "./StorageViewEmpty";
import { buttonVariants } from "@schornio/aibox-package-ui/components/button";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { formatFileSize } from "@schornio/aibox-package-utils/formatFileSize";
import { useSearchParams } from "next/navigation";
import { useStorageView } from "./StorageViewProvider";
import { useT } from "next-i18next/client";

export function StorageViewColumns() {
  const {
    basePathApp,
    basePathStorage,
    columnFolders,
    itemGroups,
    canWrite,
    storage,
    pendingFilePaths = [],
  } = useStorageView();
  const { t, i18n } = useT("common", {
    keyPrefix: "_components.StorageViewColumns",
  });
  const searchParams = useSearchParams();
  const container = useRef<HTMLDivElement>(null);
  const currentPath = basePathStorage.replace(/^\/+|\/+$/g, "");
  const [selection, setSelection] = useState<{ folder: string; file?: string }>(
    { folder: currentPath },
  );
  const selectedPath =
    selection.folder === currentPath ? selection.file : undefined;
  const setSelectedPath = (file?: string) =>
    setSelection({ file, folder: currentPath });
  const columns = (columnFolders ?? [{ objects: [], path: currentPath }]).map(
    (column) => ({
      ...column,
      objects:
        column.path === currentPath
          ? itemGroups.flatMap(([, objects]) => objects)
          : column.objects.toSorted(
              (a, b) =>
                Number(Boolean(b.folder)) - Number(Boolean(a.folder)) ||
                a.name.localeCompare(b.name),
            ),
    }),
  );
  const selected = columns
    .flatMap((column) => column.objects)
    .find((item) => item.path === selectedPath && item.file);
  const selectedColumn = selected
    ? columns.findIndex((column) => column.objects.includes(selected))
    : -1;
  const visibleColumns =
    selectedColumn < 0 ? columns : columns.slice(0, selectedColumn + 1);

  const href = (path: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "columns");
    const encodedPath = path
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    return `${basePathApp}/${encodedPath}?${params}`;
  };
  useEffect(() => {
    if (container.current)
      container.current.scrollLeft = container.current.scrollWidth;
  }, [currentPath, selected?.path]);

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
  });
  return (
    <StorageViewOptionsDropdown>
      <div className="flex min-h-48 flex-1 flex-col">
        <FileUploadDropZone disabled={!canWrite}>
          <ContainerMain>
            <div
              ref={container}
              className="flex h-[min(32rem,65vh)] min-h-80 overflow-x-auto rounded-lg border"
              role="region"
              aria-label={t("labelColumns")}
            >
              {visibleColumns.map((column, index) => {
                const nextPath = visibleColumns[index + 1]?.path;
                return (
                  <section
                    key={column.path}
                    className="flex w-64 shrink-0 flex-col border-r last:border-r-0"
                    aria-label={column.path.split("/").at(-1) || t("labelRoot")}
                  >
                    <h2 className="bg-muted shrink-0 border-b px-3 py-2 text-sm font-medium">
                      {column.path.split("/").at(-1) || t("labelRoot")}
                    </h2>
                    {column.objects.length === 0 ? (
                      <div className="p-3">
                        <StorageViewEmpty />
                      </div>
                    ) : (
                      <ul className="min-h-0 space-y-0.5 overflow-y-auto p-1">
                        {column.objects.map((item) => {
                          const active =
                            item.path === nextPath ||
                            item.path === selectedPath;
                          const className = cn(
                            "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-ring focus-visible:outline-2",
                            {
                              "bg-accent text-accent-foreground": active,
                              shimmer:
                                item.currentAction?.state === "uploading",
                              "text-destructive":
                                item.currentAction?.state === "error",
                            },
                          );
                          const content = (
                            <>
                              {item.folder ? (
                                <Folder className="size-4 shrink-0" />
                              ) : (
                                <FileIcon
                                  className="size-4 shrink-0"
                                  path={item.path}
                                />
                              )}
                              <span className="truncate">{item.name}</span>
                              {item.folder ? (
                                <ChevronRight className="ml-auto size-4 shrink-0" />
                              ) : undefined}
                            </>
                          );
                          const entry = (
                            <li
                              key={item.path}
                              onContextMenu={(event) => event.stopPropagation()}
                            >
                              {item.folder ? (
                                <Link
                                  href={href(item.path)}
                                  scroll={false}
                                  className={className}
                                  aria-current={active ? "page" : undefined}
                                  onClick={() => setSelectedPath(undefined)}
                                >
                                  {content}
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  className={className}
                                  aria-pressed={active}
                                  onClick={() => setSelectedPath(item.path)}
                                >
                                  {content}
                                </button>
                              )}
                            </li>
                          );
                          return (
                            <StorageObjectActions
                              key={item.path}
                              storageObject={item}
                              storage={storage}
                              canWrite={canWrite}
                              busy={pendingFilePaths.includes(item.path)}
                            >
                              {() => entry}
                            </StorageObjectActions>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
              {selected?.file ? (
                <section
                  className="flex w-72 shrink-0 flex-col items-center gap-4 p-5"
                  aria-label={t("labelDetails")}
                >
                  <FileIcon className="size-16" path={selected.path} />
                  <h2 className="w-full text-center font-medium break-words">
                    {selected.name}
                  </h2>
                  <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">{t("labelType")}</dt>
                    <dd>
                      <FileLabel path={selected.path} />
                    </dd>
                    <dt className="text-muted-foreground">{t("labelSize")}</dt>
                    <dd>{formatFileSize(selected.size)}</dd>
                    <dt className="text-muted-foreground">
                      {t("labelUpdated")}
                    </dt>
                    <dd>
                      {dateFormatter.format(new Date(selected.updatedAtISO))}
                    </dd>
                  </dl>
                  <StorageObjectActions
                    storageObject={selected}
                    storage={storage}
                    canWrite={canWrite}
                    busy={pendingFilePaths.includes(selected.path)}
                  />
                  <Link className={buttonVariants()} href={href(selected.path)}>
                    {t("labelOpen")}
                  </Link>
                </section>
              ) : undefined}
            </div>
          </ContainerMain>
        </FileUploadDropZone>
      </div>
    </StorageViewOptionsDropdown>
  );
}
