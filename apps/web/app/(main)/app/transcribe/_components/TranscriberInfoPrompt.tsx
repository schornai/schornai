"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  ChevronsUpDown,
  FileHeadphone,
  MessageSquareDashed,
  Pencil,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../../_components/InfoActions";
import { InfoTitle } from "../../../../_components/InfoTitle";
import Link from "next/link";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useT } from "next-i18next/client";

export function TranscriberInfoPrompt({
  editTranscriberPathname,
  editDefaultPrompt,
  editTranscriberId,
  prompt,
}: {
  editTranscriberPathname?: string;
  editDefaultPrompt?: string;
  editTranscriberId?: string;
  prompt?: string;
}) {
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberInfoPrompt",
  });

  const changed = editDefaultPrompt !== prompt;

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <FileHeadphone />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelPrompt")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editTranscriberId ? (
              <Button
                nativeButton={false}
                render={
                  <Link href={`${editTranscriberPathname ?? ""}?view=prompt`} />
                }
                size="icon-xs"
                variant="ghost"
              >
                <Pencil />
              </Button>
            ) : undefined}
            <CollapsibleTrigger
              render={
                <Button size="icon-xs" variant="ghost">
                  <ChevronsUpDown />
                </Button>
              }
            />
          </InfoActions>
        </InfoTitle>

        <CollapsibleContent>
          <AlertDescription className="pt-3">
            {(prompt?.trim().length ?? 0) === 0 ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquareDashed className="inline size-4" />{" "}
                {t("labelEmpty")}
              </span>
            ) : (
              <pre className="text-wrap">{prompt}</pre>
            )}
          </AlertDescription>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
  );
}
