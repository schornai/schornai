"use client";

import { AlertDescription } from "@schornio/aibox-package-ui/components/alert";
import { BotMessageSquare, Zap, Settings2 } from "lucide-react";
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
import { DocumentRepositoryInfoIndexKeyword } from "./DocumentRepositoryInfoIndexKeyword";
import { DocumentRepositoryInfoIndexEmbedding } from "./DocumentRepositoryInfoIndexEmbedding";
import { InfoTranscriber } from "../../../../../_components/InfoTranscriber";
import { InfoWorkspace } from "../../../../../_components/InfoWorkspace";
import { EditorOverviewSection } from "../../../../../_components/EditorOverviewSection";
import { useDocumentRepositoryEditor } from "./DocumentRepositoryEditor";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function DocumentRepositoryEditorOverview({
  mode,
}: {
  mode: "create" | "update";
}) {
  const router = useRouter();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditorOverview",
  });
  const { documentRepository, defaultDocumentRepository, relations } =
    useDocumentRepositoryEditor();

  const workspace = relations.workspaces.find(
    (workspace) => workspace.id === documentRepository?.workspaceId,
  );

  const { t: tab } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditor",
  });
  const embedding = documentRepository?.index?.embedding;
  const embeddingModel = embedding?.modelIdentifier
    ? relations.models.find(
        (item) => item.identifier === embedding.modelIdentifier,
      )
    : undefined;
  const transcriber = relations.transcribers.find(
    (item) => item.identifier === documentRepository?.transcriberIdentifier,
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

      <ContainerMain className="flex flex-col gap-4">
        <EditorOverviewSection
          view="features"
          icon={Zap}
          title={tab("tabFeatures")}
          description={
            <>
              <p>{t("helpKeywordSearch")}</p>
              <p>{t("helpEmbeddingDescription")}</p>
              <p>{t("helpTranscriberDescription")}</p>
            </>
          }
        >
          {documentRepository?.index?.keyword?.active && (
            <DocumentRepositoryInfoIndexKeyword
              indexKeywordActive={documentRepository?.index?.keyword?.active}
              editDefaultIndexKeywordActive={
                defaultDocumentRepository?.index?.keyword?.active
              }
              editable
            />
          )}
          {embedding?.active && (
            <DocumentRepositoryInfoIndexEmbedding
              indexEmbedding={embedding}
              embeddingModel={embeddingModel}
              editDefaultIndexEmbedding={
                defaultDocumentRepository?.index?.embedding
              }
              editable
            />
          )}
          {documentRepository?.transcriberIdentifier && (
            <InfoTranscriber
              transcriberIdentifier={documentRepository.transcriberIdentifier}
              transcriber={transcriber}
              editDefaultTranscriberIdentifier={
                defaultDocumentRepository?.transcriberIdentifier
              }
              editHref="?view=features#transcribe"
            />
          )}
        </EditorOverviewSection>
        <EditorOverviewSection
          view="settings"
          icon={Settings2}
          title={tab("tabSettings")}
        >
          <InfoWorkspace
            workspace={workspace}
            editDefaultWorkspaceId={defaultDocumentRepository?.workspaceId}
            editable
          />
        </EditorOverviewSection>
      </ContainerMain>
    </>
  );
}
