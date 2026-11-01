import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { File, FilePenLine, FileX } from "lucide-react";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@schornio/aibox-package-ui/components/marker";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import { ContainerChatMessagePart } from "./ContainerChatMessagePart";
import Link from "next/link";
import { StorageFilePreview } from "../../../../../_components/StorageFilePreview";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";

export function ChatMessagePartToolStorageWriteFileIcon() {
  return <FilePenLine />;
}

export function ChatMessagePartToolStorageWriteFile({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<
    ChatMessage["parts"][number],
    { type: "tool-storage-write-file" }
  >;
}) {
  const partOutput = part.output?.ok ? part.output : undefined;

  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <ChatMessagePartToolStorageWriteFileIcon />
        </MarkerIcon>
        <MarkerContent>Dokument geschrieben "{part.input?.path}"</MarkerContent>
      </Marker>

      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="p-3">
            <p>
              Dokument geschrieben: <CodeInline>{part.input?.path}</CodeInline>
            </p>

            {partOutput ? (
              <>
                <Button
                  nativeButton={false}
                  render={
                    <Link
                      href={`${storageToAppBasePath(partOutput.storage)}/${partOutput.storagePath}`}
                    />
                  }
                  size="xs"
                  variant="outline"
                >
                  <File />
                  Zum Dokument
                </Button>
              </>
            ) : undefined}
          </div>
          <hr />

          {partOutput ? (
            <div className="p-3">
              <StorageFilePreview
                fileContent={{
                  current: part.input?.content ?? "",
                  type: "mdc",
                  versions: [],
                }}
                fileObject={{
                  ...partOutput.file,
                  path: partOutput.storagePath,
                }}
                storage={partOutput.storage}
              />
            </div>
          ) : undefined}

          {part.output?.ok === false ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"
                  variant="icon"
                >
                  <FileX />
                </EmptyMedia>
                <EmptyTitle className="text-destructive">Fehler</EmptyTitle>
                <EmptyDescription>
                  Die Datei "{part.input?.path}" konnte nicht geschrieben
                  werden.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : undefined}

          <CollapsibleTrigger
            render={
              <Button
                className="text-muted-foreground w-full aria-expanded:bg-transparent"
                size="xs"
                variant="ghost"
              >
                Schließen
              </Button>
            }
          />
        </ContainerChatMessagePart>
      </CollapsibleContent>
    </Collapsible>
  );
}
