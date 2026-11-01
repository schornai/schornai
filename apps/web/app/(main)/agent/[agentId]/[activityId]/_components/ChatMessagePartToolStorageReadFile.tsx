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
import { File, FileText, FileX } from "lucide-react";
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
import { transcriptionSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { trySync } from "@schornio/aibox-package-markdown-changelog/parse";
import { useT } from "next-i18next/client";

export function ChatMessagePartToolStorageReadFileIcon() {
  return <FileText />;
}

export function ChatMessagePartToolStorageReadFile({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<
    ChatMessage["parts"][number],
    { type: "tool-storage-read-file" }
  >;
}) {
  const { i18n } = useT();
  const numberFormatter = new Intl.NumberFormat(i18n.language);

  const partOutput = part.output?.ok ? part.output : undefined;

  const { data: transcriptContent } = trySync(() =>
    transcriptionSchema.parse(JSON.parse(partOutput?.content ?? "")),
  );

  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <ChatMessagePartToolStorageReadFileIcon />
        </MarkerIcon>
        <MarkerContent>Dokument gelesen "{part.input?.path}"</MarkerContent>
      </Marker>

      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="p-3">
            <p>
              Dokument gelesen: <CodeInline>{part.input?.path}</CodeInline>
            </p>

            {partOutput ? (
              <>
                <p className="text-muted-foreground">
                  Start:{" "}
                  <strong>
                    {numberFormatter.format(partOutput.contentOffset ?? 0)}
                  </strong>{" "}
                  Länge:{" "}
                  <strong>
                    {numberFormatter.format(partOutput.contentLength)}
                  </strong>{" "}
                  Gesamte Länge:{" "}
                  <strong>
                    {numberFormatter.format(partOutput.totalLength)}
                  </strong>
                </p>
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
                fileContent={
                  transcriptContent
                    ? { ...transcriptContent, type: "transcript" }
                    : { current: partOutput.content, type: "mdc", versions: [] }
                }
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
                  Entweder die Datei "{part.input?.path}" konnte nicht gefunden
                  werden, oder Sie sind nicht berechtigt.
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
