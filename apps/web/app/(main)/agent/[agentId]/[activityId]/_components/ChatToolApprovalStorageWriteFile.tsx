"use client";

import { ChevronDown, FilePenLine } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ChatToolApprovalContent } from "./ChatToolApprovalContent";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { useState } from "react";
import { useT } from "next-i18next/client";

export function ChatToolApprovalStorageWriteFile({
  input,
}: {
  input: unknown;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.ChatToolApprovalStorageWriteFile",
  });
  const [contentOpen, setContentOpen] = useState(false);
  const path =
    typeof input === "object" &&
    input !== null &&
    "path" in input &&
    typeof input.path === "string"
      ? input.path
      : undefined;
  const content =
    typeof input === "object" &&
    input !== null &&
    "content" in input &&
    typeof input.content === "string"
      ? input.content
      : undefined;
  const isMarkdown = path?.toLowerCase().endsWith(".md") ?? false;
  return (
    <ChatToolApprovalContent
      description={t("descriptionWriteFile")}
      icon={<FilePenLine className="size-4" />}
      title={t("labelTitle")}
    >
      {path ? (
        <p className="text-muted-foreground text-xs break-all">{path}</p>
      ) : undefined}
      {content !== undefined ? (
        <Collapsible open={contentOpen} onOpenChange={setContentOpen}>
          <CollapsibleTrigger
            render={
              <Button className="-ml-2" size="xs" type="button" variant="ghost">
                <ChevronDown
                  className={contentOpen ? "rotate-180" : undefined}
                />
                {t(contentOpen ? "labelHideContent" : "labelShowContent")}
              </Button>
            }
          />
          <CollapsibleContent>
            <div className="bg-muted/40 mt-2 max-h-[40vh] overflow-auto rounded-md border p-3">
              {content.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("descriptionEmptyFile")}
                </p>
              ) : isMarkdown ? (
                <MarkdownProse className="max-w-none text-sm break-words">
                  {content}
                </MarkdownProse>
              ) : (
                <pre className="font-sans text-sm break-words whitespace-pre-wrap">
                  {content}
                </pre>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : undefined}
    </ChatToolApprovalContent>
  );
}
