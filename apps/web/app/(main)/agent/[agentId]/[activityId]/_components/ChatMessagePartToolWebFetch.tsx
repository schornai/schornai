"use client";

import { Globe } from "lucide-react";
import { useT } from "next-i18next/client";
import type { AppColor } from "@schornio/aibox-package-database/_shared/_types";
import type { ChatMessage } from "@schornio/aibox-package-database/chat/_types";
import { storageToAppBasePath } from "@/lib/storageToAppBasePath";
import { StorageObjectTile } from "../../../../../_components/StorageObjectTile";
import {
  ChatMessagePartToolWebLayout,
  WebSourceLink,
} from "./ChatMessagePartToolWebLayout";

export function ChatMessagePartToolWebFetch({
  agentColor,
  part,
}: {
  agentColor?: AppColor;
  part: Extract<ChatMessage["parts"][number], { type: "tool-web-fetch" }>;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatMessagePartToolWebFetch",
  });
  const output = part.output?.ok ? part.output : undefined;
  return (
    <ChatMessagePartToolWebLayout
      agentColor={agentColor}
      part={part}
      icon={<Globe />}
      title={t("labelFetch")}
      inputLabel={t("labelUrl")}
      inputValue={part.input?.url}
    >
      {output && "file" in output && (
        <>
          <StorageObjectTile
            basePathApp={storageToAppBasePath(output.storage)}
            storage={output.storage}
            storageObject={{ ...output.file, path: output.storagePath }}
            variant="tiles-small"
          />
          <p>
            {t(
              output.processing === "ready"
                ? "descriptionFileReady"
                : output.processing === "failed"
                  ? "descriptionProcessingFailed"
                  : "descriptionProcessingUnavailable",
            )}
          </p>
          <WebSourceLink url={output.url}>{t("labelSource")}</WebSourceLink>
          {output.content !== undefined && (
            <div className="break-words whitespace-pre-wrap">
              {output.content || t("labelEmptyPage")}
            </div>
          )}
        </>
      )}
      {output && "title" in output && (
        <>
          <WebSourceLink url={output.url}>
            {output.title || output.url}
          </WebSourceLink>
          <p className="text-muted-foreground">
            {t("labelRange", {
              start: output.contentOffset,
              end: output.contentOffset + output.content.length,
              total: output.totalLength,
            })}
          </p>
          {output.truncated && <p>{t("descriptionTruncated")}</p>}
          <div className="break-words whitespace-pre-wrap">
            {output.content || t("labelEmptyPage")}
          </div>
        </>
      )}
    </ChatMessagePartToolWebLayout>
  );
}
