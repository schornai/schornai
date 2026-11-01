"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { ChevronsUpDown, Pencil, VectorPolygon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { InfoActions } from "../../../../../_components/InfoActions";
import { InfoTitle } from "../../../../../_components/InfoTitle";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useT } from "next-i18next/client";

export function DocumentRepositoryInfoIndexEmbedding({
  editPathname,
  editDefaultIndexEmbedding,
  editable,
  embeddingModel,
  indexEmbedding,
}: {
  editPathname?: string;
  editDefaultIndexEmbedding?: NonNullable<
    DocumentRepository["index"]
  >["embedding"];
  editable?: boolean;
  embeddingModel?: AIModel;
  indexEmbedding?: NonNullable<DocumentRepository["index"]>["embedding"];
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.DocumentRepositoryInfoIndexEmbedding",
  });

  const changed =
    editable &&
    composite(editDefaultIndexEmbedding) !== composite(indexEmbedding);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <VectorPolygon />
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
                  <Link href={`${editPathname ?? ""}?view=features#index`} />
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
            <strong>
              {indexEmbedding ? t("labelActive") : t("labelInactive")}
            </strong>
          </div>
          <CollapsibleContent>
            <AlertDescription>
              <p>{t("description")}</p>
              {embeddingModel ? (
                <>
                  <strong>{embeddingModel.name}</strong>

                  {embeddingModel.image ? (
                    <div className="bg-muted my-3 aspect-video max-w-xs overflow-hidden rounded-md">
                      <img
                        alt=""
                        className="h-full w-full object-contain"
                        height={180}
                        src={`/api/storage/model_images/${embeddingModel.image.path}`}
                        width={320}
                      />
                    </div>
                  ) : undefined}

                  {embeddingModel.description &&
                  embeddingModel.description.length > 0 ? (
                    <MarkdownProse className="mt-3 max-w-none">
                      {embeddingModel.description}
                    </MarkdownProse>
                  ) : undefined}
                </>
              ) : (
                <strong>{t("labelUnknownModel")}</strong>
              )}
            </AlertDescription>
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
