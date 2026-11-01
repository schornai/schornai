"use client";

import { useState, type ComponentProps } from "react";
import { Ellipsis, X } from "lucide-react";
import { useT } from "next-i18next/client";
import type { StorageRealtimeObject } from "@schornio/aibox-realtime/documents/storage/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { StorageActionMenu } from "./StorageActionMenu";
import { StorageFileActions } from "./StorageFileActions";
import { StorageDialogRemove } from "./StorageDialogRemove";
import { useStorageView } from "./StorageViewProvider";

type Props = Omit<ComponentProps<typeof StorageFileActions>, "file"> & {
  storageObject: StorageRealtimeObject;
};

export function StorageObjectActions({ storageObject, ...props }: Props) {
  return storageObject.file ? (
    <StorageFileActions file={storageObject} {...props} />
  ) : (
    <StorageFolderActions storageObject={storageObject} {...props} />
  );
}

function StorageFolderActions({
  storageObject,
  canWrite,
  busy,
  children,
}: Props) {
  const { basePathStorage } = useStorageView();
  const { t } = useT("common", {
    keyPrefix: "_components.StorageObjectActions",
  });
  const [removeOpen, setRemoveOpen] = useState(false);
  const path = storageObject.path.replace(/^\/+|\/+$/g, "");
  const currentPath = basePathStorage.replace(/^\/+|\/+$/g, "");
  // Never offer removal of the root, current folder, or its ancestors in columns.
  const canRemove =
    canWrite &&
    path &&
    path !== currentPath &&
    !currentPath.startsWith(`${path}/`);
  if (!canRemove) return children?.(null) ?? null;
  return (
    <>
      <StorageActionMenu
        children={children}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("labelActions", { name: storageObject.name })}
          >
            <Ellipsis />
          </Button>
        }
        items={
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              disabled={busy}
              onClick={() => setRemoveOpen(true)}
            >
              <X />
              {t("labelDelete")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        }
      />
      <StorageDialogRemove
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        path={path}
        type="folder"
      />
    </>
  );
}
