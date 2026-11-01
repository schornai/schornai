"use client";
import { Copy, FolderInput, File } from "lucide-react";
import Link from "next/link";
import { useT } from "next-i18next/client";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerChatMessagePart } from "./ContainerChatMessagePart";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@schornio/aibox-package-ui/components/marker";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import { Separator } from "@schornio/aibox-package-ui/components/separator";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
export function ChatMessagePartToolStorageTransferFile({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<
    ChatMessage["parts"][number],
    { type: "tool-storage-copy-file" | "tool-storage-move-file" }
  >;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMessagePartToolStorageTransferFile",
  });
  const move = part.type === "tool-storage-move-file";
  const output = part.output?.ok ? part.output : undefined;
  const denied =
    part.state === "output-denied" ||
    (part.state === "approval-responded" && !part.approval.approved);
  const failed =
    part.state === "output-error" ||
    part.output?.ok === false ||
    (part.state === "output-available" && !output);
  const status = denied
    ? "descriptionDenied"
    : failed
      ? "errorTransfer"
      : output
        ? output.processing === "error"
          ? "descriptionProcessingError"
          : "descriptionSuccess"
        : part.state === "approval-requested"
          ? "descriptionApproval"
          : part.state === "input-streaming"
            ? "descriptionPending"
            : "descriptionRunning";
  const error =
    part.state === "output-error"
      ? part.errorText
      : part.output?.ok === false
        ? part.output.error
        : undefined;
  return (
    <Collapsible>
      <Marker render={<CollapsibleTrigger />}>
        <MarkerIcon>{move ? <FolderInput /> : <Copy />}</MarkerIcon>
        <MarkerContent>
          {t(move ? "labelMove" : "labelCopy")}: {part.input?.fromPath} →{" "}
          {part.input?.toPath} · {t(status)}
        </MarkerContent>
      </Marker>
      <CollapsibleContent>
        <ContainerChatMessagePart agentColor={agentColor}>
          <div className="flex min-w-0 flex-col gap-2 p-3 wrap-anywhere">
            <p>
              {t("labelSource")}:{" "}
              <CodeInline>{part.input?.fromPath}</CodeInline>
            </p>
            <p>
              {t("labelTarget")}: <CodeInline>{part.input?.toPath}</CodeInline>
            </p>
          </div>
          <Separator />
          <div className="flex min-w-0 flex-col gap-3 p-3 wrap-anywhere">
            {failed ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {t(status)}
                  {error && <p>{error}</p>}
                </AlertDescription>
              </Alert>
            ) : (
              <p role="status">{t(status)}</p>
            )}
            {output && (
              <Button
                role="link"
                nativeButton={false}
                variant="outline"
                size="xs"
                render={
                  <Link
                    href={`${storageToAppBasePath(output.storage)}/${output.storagePath.split("/").map(encodeURIComponent).join("/")}`}
                  />
                }
              >
                <File />
                {t("labelOpenFile")}
              </Button>
            )}
          </div>
          <CollapsibleTrigger
            render={
              <Button
                className="w-full aria-expanded:bg-transparent"
                size="xs"
                variant="ghost"
              >
                {t("labelClose")}
              </Button>
            }
          />
        </ContainerChatMessagePart>
      </CollapsibleContent>
    </Collapsible>
  );
}
