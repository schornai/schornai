"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { AudioLines, ChevronsUpDown, Pencil } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoActions } from "../../../../../_components/InfoActions";
import { InfoTitle } from "../../../../../_components/InfoTitle";
import Link from "next/link";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useT } from "next-i18next/client";

export function DocumentRepositoryInfoTranscriber({
  editPathname,
  editDefaultTranscriberIdentifier,
  editable,
  transcriber,
  transcriberIdentifier,
}: {
  editPathname?: string;
  editDefaultTranscriberIdentifier?: string;
  editable?: boolean;
  transcriber?: Transcriber_new;
  transcriberIdentifier?: string;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.DocumentRepositoryInfoTranscriber",
  });

  const changed =
    editable &&
    (editDefaultTranscriberIdentifier ?? false) !==
      (transcriberIdentifier ?? false);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <AudioLines />
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
                  <Link
                    href={`${editPathname ?? ""}?view=features#transcribe`}
                  />
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
          <div className="flex gap-1">
            <strong>{transcriber?.name ?? t("labelUnknownTranscriber")}</strong>
          </div>
          <CollapsibleContent>
            <AlertDescription>
              <p>{transcriber?.description}</p>
              <Button
                className="no-underline!"
                nativeButton={false}
                render={<Link href={`/app/transcribe/${transcriber?.id}`} />}
                size="xs"
                variant="outline"
              >
                <AudioLines /> {t("labelGoToTranscriber")}
              </Button>
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
