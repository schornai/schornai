"use client";

import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { DocumentRepositoryCard } from "../../_components/DocumentRepositoryCard";
import { DocumentRepositoryInfoIndexEmbedding } from "./DocumentRepositoryInfoIndexEmbedding";
import { DocumentRepositoryInfoIndexKeyword } from "./DocumentRepositoryInfoIndexKeyword";
import { DocumentRepositoryInfoTranscriber } from "./DocumentRepositoryInfoTranscriber";
import { InfoWorkspace } from "../../../../../_components/InfoWorkspace";
import type { SettingFavorites } from "../../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaim } from "../../../../../_models/getWorkspaceClaims";

export function DocumentRepositoryInfo({
  editDocumentRepositoryPathname,
  editDefaultDocumentRepository,
  editable,
  favorites,
  modelMap,
  documentRepository,
  transcriberMap,
  workspace,
}: {
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

  return (
    <ContainerMain className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr]">
      <DocumentRepositoryCard
        favorites={favorites}
        documentRepository={documentRepository}
        embeddingModel={embeddingModel}
        transcriber={transcriber}
        workspace={workspace}
      />
      <div className="flex flex-col gap-1">
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
          <DocumentRepositoryInfoTranscriber
            editDefaultTranscriberIdentifier={
              editDefaultDocumentRepository?.transcriberIdentifier
            }
            editPathname={editDocumentRepositoryPathname}
            editable={editable}
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
      </div>
    </ContainerMain>
  );
}
