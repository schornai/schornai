"use client";

import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { useT } from "next-i18next/client";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import {
  Bubble,
  BubbleContent,
} from "@schornio/aibox-package-ui/components/bubble";
import { AttachmentGroup } from "@schornio/aibox-package-ui/components/attachment";
import { ChatMessagePartUserText } from "./ChatMessagePartUserText";
import type { ChatMessage as ChatMessageType } from "@schornio/aibox-package-database/chat/_types";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import { Fragment } from "react";
import { StorageObjectTile } from "../../../../../_components/StorageObjectTile";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { getFileCategory } from "@schornio/aibox-package-utils/getFileTypeLabel";
import { useStorageView } from "../../../../../_components/StorageViewProvider";

export function ChatMessageUser({ message }: { message: ChatMessageType }) {
  const { basePathApp, storage } = useStorageView();

  const { t } = useT("agent", { keyPrefix: "_components.VoiceMessage" });
  const voice = message.parts.find((part) => part.type === "data-voice")?.data;
  const textParts = message.parts.filter((part) => part.type === "text");
  const fileParts = message.parts.filter((part) => part.type === "data-file");
  const hasImage = fileParts.some(
    (filePart) => getFileCategory(filePart.data.url) === "image",
  );

  if (voice) {
    const { storagePath } = StorageSession.getStoragePath(voice.path, storage);
    const src =
      "/api/storage/" +
      StorageSession.getStorageName(storage.type) +
      "/" +
      storagePath.split("/").map(encodeURIComponent).join("/");
    return (
      <Bubble variant="muted" align="end">
        <BubbleContent className="w-80">
          <VoiceMessagePlayer
            src={src}
            {...voice}
            transcript={textParts.map((part) => part.text).join("\n")}
            status={
              !textParts.length ? t("labelAwaitingTranscript") : undefined
            }
          />
        </BubbleContent>
      </Bubble>
    );
  }
  return (
    <>
      {textParts.map((part, index) => (
        <ChatMessagePartUserText
          key={`${message.id}_${part.type}_${index}`}
          text={part.text}
        />
      ))}

      {fileParts.length > 0 ? (
        <AttachmentGroup>
          {fileParts.map((part, index) => (
            <Fragment key={`${message.id}_${part.type}_${index}`}>
              {part.type === "data-file" ? (
                <StorageObjectTile
                  basePathApp={
                    part.data.attachment
                      ? storageToAppBasePath(part.data.attachment.storage)
                      : basePathApp
                  }
                  className={cn("w-72", {
                    "w-48 has-data-[slot=attachment-content]:w-48": hasImage,
                  })}
                  storage={part.data.attachment?.storage ?? storage}
                  storageObject={{
                    createdAtISO: new Date().toISOString(),
                    file: true,
                    name: part.data.name,
                    path: part.data.url,
                    size: 0,
                    type: part.data.type,
                    updatedAtISO: new Date().toISOString(),
                  }}
                  variant={hasImage ? "tiles-medium" : "tiles-small"}
                />
              ) : undefined}
            </Fragment>
          ))}
        </AttachmentGroup>
      ) : undefined}
    </>
  );
}
