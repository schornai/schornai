import { CircleQuestionMark, FolderX, Search } from "lucide-react";
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
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { StorageObjectTile } from "../../../../../_components/StorageObjectTile";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";

export function ChatMessagePartToolStorageSearchIcon() {
  return <Search />;
}

export function ChatMessagePartToolStorageSearch({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<ChatMessage["parts"][number], { type: "tool-storage-search" }>;
}) {
  const partOutput = part.output?.ok ? part.output : undefined;

  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <ChatMessagePartToolStorageSearchIcon />
        </MarkerIcon>
        <MarkerContent>
          Suchen "{part.input?.keywords?.join(", ")}"
        </MarkerContent>
      </Marker>

      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="p-3">
            Suchen:{" "}
            <CodeInline>"{part.input?.keywords?.join(", ")}"</CodeInline>
          </div>
          <hr />

          {partOutput ? (
            <>
              {partOutput.content.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CircleQuestionMark />
                    </EmptyMedia>
                    <EmptyTitle>Keine Ergebnisse</EmptyTitle>
                    <EmptyDescription>
                      Die Suche lieferte keine Ergebnisse.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ContainerMain className="flex flex-col gap-9">
                  {partOutput.content.map((result) => (
                    <div
                      className="grid grid-cols-[1fr_2fr] items-center gap-1"
                      key={result.file.path}
                    >
                      <StorageObjectTile
                        basePathApp={storageToAppBasePath(result.storage)}
                        storage={result.storage}
                        storageObject={{
                          ...result.file,
                          path: result.storagePath,
                        }}
                        variant="tiles-small"
                      />
                      <div>
                        <div className="text-muted-foreground line-clamp-3 text-xs">
                          ({result.digestOffset} Zeichen) ... {result.digest}
                        </div>
                      </div>
                    </div>
                  ))}
                </ContainerMain>
              )}
            </>
          ) : undefined}

          {part.output?.ok === false ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive"
                  variant="icon"
                >
                  <FolderX />
                </EmptyMedia>
                <EmptyTitle className="text-destructive">Fehler</EmptyTitle>
                <EmptyDescription>Unerwarteter Fehler</EmptyDescription>
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
