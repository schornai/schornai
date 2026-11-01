"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { CircleQuestionMark } from "lucide-react";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import type { DocumentRepositorySearchResult } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { Storage } from "@schornio/aibox-package-database/storage/_types";
import { StorageObjectTile } from "./StorageObjectTile";
import { useT } from "next-i18next/client";

export default function StorageSearchResult({
  basePathApp,
  results,
  storage,
}: {
  basePathApp: string;
  results: DocumentRepositorySearchResult[];
  storage: Storage;
}) {
  const { t } = useT("common", {
    keyPrefix: "_components.StorageSearchResult",
  });

  return (
    <>
      {results.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <CircleQuestionMark />
            </EmptyMedia>
            <EmptyTitle>{t("labelNoResults")}</EmptyTitle>
            <EmptyDescription>{t("descriptionNoResults")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ContainerMain className="flex flex-col gap-9">
          {results.map((result) => (
            <div
              className="grid grid-cols-[1fr_2fr] items-center gap-1"
              key={result.file.path}
            >
              <StorageObjectTile
                basePathApp={basePathApp}
                storage={storage}
                storageObject={result.file}
                variant="tiles-small"
              />
              <div>
                <div className="text-muted-foreground line-clamp-3 text-xs">
                  ({result.digestOffset} {t("labelCharacters")}) ...{" "}
                  {result.digest}
                </div>
              </div>
            </div>
          ))}
        </ContainerMain>
      )}
    </>
  );
}
