import { StorageViewOptionsDropdown } from "./StorageViewOptionsDropdown";
import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import { StorageObjectActions } from "./StorageObjectActions";
import { FileLabel } from "./FileLabel";
import { FileUploadDropZone } from "./FileUploadDropZone";
import { Fragment } from "react/jsx-runtime";
import { StorageObjectTile } from "./StorageObjectTile";
import { StorageViewEmpty } from "./StorageViewEmpty";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useStorageView } from "./StorageViewProvider";
import { useT } from "next-i18next/client";

export function StorageViewTiles() {
  const { t } = useT("common", {
    keyPrefix: "_components.StorageViewTable",
  });

  const {
    basePathApp,
    group,
    itemGroups,
    storage,
    view,
    canWrite,
    pendingFilePaths = [],
  } = useStorageView();

  return (
    <StorageViewOptionsDropdown>
      <div className="flex min-h-48 flex-1 flex-col">
        <FileUploadDropZone disabled={!canWrite}>
          {itemGroups.length === 0 ? <StorageViewEmpty /> : undefined}
          {itemGroups.map(([groupId, itemGroup]) => (
            <Fragment key={toKey(groupId)}>
              {group === "created" || group === "updated" ? (
                <div className="bg-muted p-3 font-medium">
                  {groupId === "today" ? t("groupTimeToday") : undefined}
                  {groupId === "last7Days"
                    ? t("groupTimeLast7Days")
                    : undefined}
                  {groupId === "last30Days"
                    ? t("groupTimeLast30Days")
                    : undefined}
                  {groupId === NO_GROUP_KEY ? t("groupTimeOther") : undefined}
                </div>
              ) : undefined}

              {group === "first-letter" ? (
                <div className="bg-muted p-3 font-medium">
                  {String(groupId)}
                </div>
              ) : undefined}

              {group === "type" ? (
                <div className="bg-muted p-3 font-medium">
                  <FileLabel path={String(groupId)} />
                </div>
              ) : undefined}

              <div
                className={cn("grid justify-center gap-3 p-3", {
                  "grid-cols-[repeat(auto-fill,120px)]":
                    view === "tiles-medium",
                  "grid-cols-[repeat(auto-fill,208px)]": view === "tiles-large",
                  "grid-cols-[repeat(auto-fill,288px)]": view === "tiles-small",
                })}
              >
                {itemGroup.map((storageObject) => {
                  const tile = (actions?: React.ReactNode) => (
                    <div
                      key={storageObject.path}
                      onContextMenu={(event) => event.stopPropagation()}
                    >
                      <StorageObjectTile
                        basePathApp={basePathApp}
                        storage={storage}
                        storageObject={storageObject}
                        variant={view}
                        actions={actions}
                      />
                    </div>
                  );
                  return (
                    <StorageObjectActions
                      key={storageObject.path}
                      storageObject={storageObject}
                      storage={storage}
                      canWrite={canWrite}
                      busy={pendingFilePaths.includes(storageObject.path)}
                    >
                      {tile}
                    </StorageObjectActions>
                  );
                })}
              </div>
            </Fragment>
          ))}
        </FileUploadDropZone>
      </div>
    </StorageViewOptionsDropdown>
  );
}
