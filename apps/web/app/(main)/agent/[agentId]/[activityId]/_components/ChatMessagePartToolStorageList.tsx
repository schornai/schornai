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
import { FolderOpen, FolderX, List } from "lucide-react";
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
import { StorageObjectTile } from "../../../../../_components/StorageObjectTile";
import { StorageObjectTileContainer } from "../../../../../_components/StorageObjectTileContainer";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";

export function ChatMessagePartToolStorageListIcon() {
  return <List />;
}

export function ChatMessagePartToolStorageList({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<ChatMessage["parts"][number], { type: "tool-storage-list" }>;
}) {
  const partOutput = part.output?.ok ? part.output : undefined;
  const path = resolvePath(part.input?.path);

  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>
          <ChatMessagePartToolStorageListIcon />
        </MarkerIcon>
        <MarkerContent>
          Ordnerinhalte aufgelistet "{part.input?.path}"
        </MarkerContent>
      </Marker>

      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="p-3">
            Ordnerinhalte aufgelistet:{" "}
            <CodeInline>{part.input?.path}</CodeInline>
          </div>
          <hr />

          {partOutput ? (
            <>
              {partOutput.content.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderOpen />
                    </EmptyMedia>
                    <EmptyTitle>Keine Dateien</EmptyTitle>
                    <EmptyDescription>
                      Der aktuelle Ordner enthält keine Dateien.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <StorageObjectTileContainer view="tiles-medium">
                  {partOutput.content
                    .map((storageObject) => ({
                      ...storageObject,
                      path: resolvePath(
                        storageObject.path.replace(
                          path,
                          partOutput.storageParent?.path ?? "",
                        ),
                      ),
                    }))
                    .map((storageObject) => (
                      <StorageObjectTile
                        basePathApp={storageToAppBasePath(partOutput.storage)}
                        key={storageObject.path}
                        storage={partOutput.storage}
                        storageObject={storageObject}
                        variant={"tiles-medium"}
                      />
                    ))}
                </StorageObjectTileContainer>
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
                <EmptyDescription>
                  Entweder der Ordner "{part.input?.path}" konnte nicht gefunden
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
