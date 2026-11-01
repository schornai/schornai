"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Book, ChevronsUpDown, Pencil } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useT } from "next-i18next/client";

export function AgentInfoDocs({
  docs,
  editAgentPathname,
  editDefaultDocs,
  editable,
}: {
  docs: string;
  editAgentPathname?: string;
  editDefaultDocs?: string;
  editable?: boolean;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentInfoDocs",
  });

  const changed = editable && composite(editDefaultDocs) !== composite(docs);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Book />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editable ? (
              <Button
                nativeButton={false}
                render={
                  <Link href={`${editAgentPathname ?? ""}?view=docs#docs`} />
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
        <AlertDescription>
          <CollapsibleContent>
            <AlertDescription className="pt-3">
              <MarkdownProse className="max-w-none">{docs}</MarkdownProse>
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
