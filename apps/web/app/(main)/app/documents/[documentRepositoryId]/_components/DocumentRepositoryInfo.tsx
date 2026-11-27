"use client";
import { ResourceRemovalDialog } from "../../../../../_components/ResourceRemovalDialog";
import { deleteDocumentRepository } from "../../_actions/deleteDocumentRepository";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ResourceInfoLayout } from "../../../../../_components/ResourceInfoLayout";
import { DocumentRepositoryIconGroupActions } from "../../_components/DocumentRepositoryIconGroupActions";
import { hasPermission } from "@/lib/hasPermission";
import { XRAGObjectActions } from "../../../../../_components/xrag/XRAGObjectActions";

import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { DocumentRepositoryCard } from "../../_components/DocumentRepositoryCard";
import { DocumentRepositoryInfoIndexEmbedding } from "./DocumentRepositoryInfoIndexEmbedding";
import { DocumentRepositoryInfoIndexKeyword } from "./DocumentRepositoryInfoIndexKeyword";
import { InfoTranscriber } from "../../../../../_components/InfoTranscriber";
import { InfoWorkspace } from "../../../../../_components/InfoWorkspace";
import type { SettingFavorites } from "../../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaim } from "../../../../../_models/getWorkspaceClaims";

export function DocumentRepositoryInfo({
  showResourceActions = false,
  preview = false,
  editDocumentRepositoryPathname,
  editDefaultDocumentRepository,
  editable,
  favorites,
  modelMap,
  documentRepository,
  transcriberMap,
  workspace,
}: {
  showResourceActions?: boolean;
  preview?: boolean;
  editDocumentRepositoryPathname?: string;
  editDefaultDocumentRepository?: Partial<DocumentRepository>;
  editable?: boolean;
  favorites?: SettingFavorites;
  modelMap?: Map<string | symbol, AIModel>;
  documentRepository?: Partial<DocumentRepository>;
  transcriberMap?: Map<string | symbol, Transcriber_new>;
  workspace?: WorkspaceClaim;
}) {
  const embeddingModel = documentRepository?.index?.embedding?.active
    ? modelMap?.get(documentRepository?.index.embedding.modelIdentifier ?? "")
    : undefined;

  const transcriber = transcriberMap?.get(
    documentRepository?.transcriberIdentifier ?? "",
  );

  const { t: editorText } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryEditor",
  });
  const remove = useAction(deleteDocumentRepository);
  const id = documentRepository?.id;
  const canManage = hasPermission({
    claim: workspace?.claim,
    permission: "workspace-admin",
  });
  return (
    <ContainerMain>
      <ResourceInfoLayout
        card={
          <DocumentRepositoryCard
            preview={preview}
            favorites={favorites}
            documentRepository={documentRepository}
            embeddingModel={embeddingModel}
            transcriber={transcriber}
            workspace={workspace}
          />
        }
        actions={
          showResourceActions &&
          !preview &&
          id && (
            <DocumentRepositoryIconGroupActions
              display="buttons"
              favorites={favorites}
              workspace={workspace}
              documentRepository={documentRepository}
              packageActions={
                canManage && (
                  <XRAGObjectActions kind="documentRepository" id={id} />
                )
              }
              remove={
                canManage && (
                  <ResourceRemovalDialog
                    label={editorText("labelDeleteDocumentRepository")}
                    title={editorText("confirmDeleteTitle")}
                    description={editorText("confirmDeleteDescription", {
                      name: documentRepository?.name,
                    })}
                    cancel={editorText("labelCancel")}
                    onOpen={remove.reset}
                    isPending={remove.isPending}
                    hasErrored={remove.hasErrored}
                    onConfirm={() =>
                      remove.execute({ documentRepositoryId: id })
                    }
                  />
                )
              }
            />
          )
        }
      >
        {documentRepository?.index?.keyword?.active ? (
          <DocumentRepositoryInfoIndexKeyword
            editPathname={editDocumentRepositoryPathname}
            editDefaultIndexKeywordActive={
              editDefaultDocumentRepository?.index?.keyword?.active
            }
            editable={editable}
            indexKeywordActive={documentRepository?.index?.keyword?.active}
          />
        ) : undefined}

        {documentRepository?.index?.embedding?.active ? (
          <DocumentRepositoryInfoIndexEmbedding
            editPathname={editDocumentRepositoryPathname}
            editDefaultIndexEmbedding={
              editDefaultDocumentRepository?.index?.embedding
            }
            editable={editable}
            embeddingModel={embeddingModel}
            indexEmbedding={documentRepository?.index?.embedding}
          />
        ) : undefined}

        {documentRepository?.transcriberIdentifier ? (
          <InfoTranscriber
            editDefaultTranscriberIdentifier={
              editDefaultDocumentRepository?.transcriberIdentifier
            }
            editHref={
              editable
                ? `${editDocumentRepositoryPathname ?? ""}?view=features#transcribe`
                : undefined
            }
            transcriber={transcriber}
            transcriberIdentifier={documentRepository.transcriberIdentifier}
          />
        ) : undefined}

        <InfoWorkspace
          editPathname={editDocumentRepositoryPathname}
          editDefaultWorkspaceId={editDefaultDocumentRepository?.workspaceId}
          editable={editable}
          workspace={workspace}
        />
      </ResourceInfoLayout>
    </ContainerMain>
  );
}
