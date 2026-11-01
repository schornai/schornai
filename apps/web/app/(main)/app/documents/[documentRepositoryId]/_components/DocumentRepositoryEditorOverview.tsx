"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  AudioLines,
  BotMessageSquare,
  Info,
  Search,
  VectorPolygon,
} from "lucide-react";
import {
  Checklist,
  ChecklistItem,
  ChecklistItemContent,
  ChecklistItemHeader,
  ChecklistItemIndicator,
} from "@schornio/aibox-package-ui/components/checklist";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { DocumentRepositoryInfo } from "./DocumentRepositoryInfo";
import type { SettingFavorites } from "../../../../../_models/currentUserConfigFavorites";
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorOverview({
  favorites,
  mode,
}: {
  favorites?: SettingFavorites;
  mode: "create" | "update";
}) {
  const router = useRouter();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorOverview",
  });
  const { documentRepository, defaultDocumentRepository, relations } =
    useDocumentRepositoryEditor();

  const modelMap = new Map(
    relations.models.map((model) => [model.identifier, model]),
  );

  const transcriberMap = new Map(
    relations.transcribers.map((transcribers) => [
      transcribers.identifier,
      transcribers,
    ]),
  );

  const workspace = relations.workspaces.find(
    (workspace) => workspace.id === documentRepository?.workspaceId,
  );

  return (
    <>
      {mode === "create" ? (
        <>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BotMessageSquare />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <AlertDescription>{t("emptyDescription")}</AlertDescription>
            </EmptyHeader>
          </Empty>

          <ContainerMain size="narrow">
            <Checklist>
              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    documentRepository?.index?.embedding?.active &&
                    documentRepository.index.embedding.modelIdentifier
                      ? "success"
                      : undefined
                  }
                />
                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => {
                    router.push(`?view=features#index`);
                  }}
                >
                  {t("checklistSemanticSearchTitle")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("checklistSemanticSearchDescription")}
                </ChecklistItemContent>
              </ChecklistItem>

              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    documentRepository?.transcriberIdentifier
                      ? "success"
                      : undefined
                  }
                />
                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => {
                    router.push(`?view=features#transcribe`);
                  }}
                >
                  {t("checklistTranscriberTitle")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("checklistTranscriberDescription")}
                </ChecklistItemContent>
              </ChecklistItem>
            </Checklist>
          </ContainerMain>

          <hr className="my-10" />
        </>
      ) : undefined}

      <DocumentRepositoryInfo
        favorites={favorites}
        editDefaultDocumentRepository={defaultDocumentRepository}
        editable={true}
        modelMap={modelMap}
        transcriberMap={transcriberMap}
        documentRepository={documentRepository}
        workspace={workspace}
      />

      <hr className="my-10" />

      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title={t("helpTitle")}>
          <Info className="mx-auto" size={40} />
        </h2>

        <Alert>
          <Search />
          <AlertDescription>{t("helpKeywordSearch")}</AlertDescription>
        </Alert>

        <Alert>
          <VectorPolygon />
          <AlertDescription>{t("helpEmbeddingDescription")}</AlertDescription>
        </Alert>

        <Alert>
          <AudioLines />
          <AlertDescription>{t("helpTranscriberDescription")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
