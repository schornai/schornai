"use client";

import {
  Attachment,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@schornio/aibox-package-ui/components/attachment";
import type { ReactNode } from "react";
import { Folder, LoaderCircle } from "lucide-react";
import {
  fileNeedsProcessing,
  getFileCategory,
} from "@schornio/aibox-package-utils/getFileTypeLabel";
import { FileIcon } from "./FileIcon";
import { FileLabel } from "./FileLabel";
import Link from "next/link";
import type { Storage } from "@schornio/aibox-package-database/storage/_types";
import type { StorageRealtimeObject } from "@schornio/aibox-realtime/documents/storage/_types";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
// import { useT } from "next-i18next/client";

export type StorageObjectTileVariant =
  "tiles-small" | "tiles-medium" | "tiles-large";

function getAttachmentState(storageObject: StorageRealtimeObject) {
  switch (storageObject.currentAction?.state) {
    case "error":
    case "processing":
    case "uploading":
      return storageObject.currentAction.state;
  }

  if (
    storageObject.file &&
    !storageObject.readableContent &&
    storageObject.currentAction?.state === "created" &&
    !storageObject.currentAction.content &&
    fileNeedsProcessing(storageObject.path)
  ) {
    return "idle";
  }

  return undefined;
}

export function StorageObjectTile({
  actions,
  basePathApp,
  className,
  storage,
  storageObject,
  variant,
}: {
  actions?: ReactNode;
  basePathApp?: string;
  className?: string;
  storage?: Storage;
  storageObject: StorageRealtimeObject;
  variant: StorageObjectTileVariant | (string & {});
}) {
  // const { t } = useT("common", {
  //   keyPrefix: "_components.StorageObjectTile",
  // });

  const attachmentState = getAttachmentState(storageObject);

  return (
    <Attachment
      className={cn(
        {
          "w-full": variant === "tiles-small",
          "w-full has-data-[slot=attachment-content]:w-full":
            variant === "tiles-medium" || variant === "tiles-large",
        },
        className,
      )}
      key={storageObject.path}
      orientation={variant === "tiles-small" ? "horizontal" : "vertical"}
      state={attachmentState}
    >
      {storage && getFileCategory(storageObject.path) === "image" ? (
        <AttachmentMedia
          variant={attachmentState === "uploading" ? undefined : "image"}
        >
          {!attachmentState ||
          attachmentState === "idle" ||
          attachmentState === "processing" ? (
            <img
              src={`/api/storage/${StorageSession.getStorageName(storage.type)}/${
                StorageSession.getStoragePath(storageObject.path, storage)
                  .storagePath
              }`}
            />
          ) : undefined}
          {attachmentState === "uploading" ? (
            <LoaderCircle className="animate-spin" />
          ) : undefined}
        </AttachmentMedia>
      ) : (
        <AttachmentMedia>
          {attachmentState === "uploading" ||
          attachmentState === "processing" ? (
            <LoaderCircle className="animate-spin" />
          ) : undefined}
          {!attachmentState || attachmentState === "idle" ? (
            <>
              {storageObject.file ? (
                <FileIcon path={storageObject.path} />
              ) : undefined}
              {storageObject.folder ? <Folder /> : undefined}
            </>
          ) : undefined}
        </AttachmentMedia>
      )}

      <AttachmentContent>
        <AttachmentTitle>{storageObject.name}</AttachmentTitle>
        <AttachmentDescription>
          {attachmentState === "error" ? "Fehler" : undefined}

          {attachmentState === "processing"
            ? "Datei wird verarbeitet..."
            : undefined}

          {attachmentState === "uploading" ? (
            <>
              Datei wird hochgeladen ·{" "}
              {storageObject.currentAction?.state === "uploading"
                ? Math.floor(storageObject.currentAction.progress * 100)
                : undefined}{" "}
              %
            </>
          ) : undefined}

          {/* diesen string gibts auch in storage file preview mdc "Noch nicht verarbeitet" */}
          {attachmentState === "idle" ? "Noch nicht verarbeitet" : undefined}

          {!attachmentState ? (
            <>
              {storageObject.file ? (
                <FileLabel path={storageObject.path} />
              ) : undefined}
              {storageObject.folder ? <FileLabel path="folder" /> : undefined}
            </>
          ) : undefined}
        </AttachmentDescription>
      </AttachmentContent>

      {actions ? <AttachmentActions>{actions}</AttachmentActions> : undefined}

      {basePathApp ? (
        <AttachmentTrigger
          aria-label={storageObject.name}
          render={<Link href={`${basePathApp}/${storageObject.path}`} />}
        />
      ) : undefined}
    </Attachment>
  );
}
