import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { DocumentRepositoryInfo } from "../_components/DocumentRepositoryInfo";
import { FolderOpen } from "lucide-react";
import { TabsDocumentRepository } from "../_components/TabsDocumentRepository";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../../../_models/getAIModels";
import { getCurrentUserConfigFavorites } from "../../../../../_models/currentUserConfigFavorites";
import { getDocumentRepositoryById } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoryById";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";
import { getWorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page(
  props: PageProps<"/app/documents/[documentRepositoryId]/info">,
) {
  const [{ documentRepositoryId }, supabase] = await Promise.all([
    props.params,
    createSupabaseServerClient(),
  ]);
  const [
    { data: documentRepository },
    favorites,
    models,
    transcribers,
    { claims: workspaces },
  ] = await Promise.all([
    tryAsync(() =>
      getDocumentRepositoryById(documentRepositoryId, { supabase }),
    ),
    getCurrentUserConfigFavorites(),
    getAIModels(),
    getTranscribers({ supabase }),
    getWorkspaceClaims(),
  ]);

  if (!documentRepository) {
    notFound();
  }

  const transcriberMap = new Map(
    transcribers.map((transcribers) => [transcribers.identifier, transcribers]),
  );
  const modelMap = new Map(models.map((model) => [model.identifier, model]));

  return (
    <>
      <HeaderMain appColor={documentRepository?.color}>
        <HeaderMainContent>
          <FolderOpen />
          {documentRepository?.name}
        </HeaderMainContent>
      </HeaderMain>

      <TabsDocumentRepository
        documentRepositoryId={documentRepositoryId}
        hasFulltextSearch={
          documentRepository.index?.embedding?.active ||
          documentRepository.index?.keyword?.active
        }
        pathSegment="info"
      />

      <DocumentRepositoryInfo
        editDefaultDocumentRepository={documentRepository}
        editDocumentRepositoryPathname={`/app/documents/${documentRepositoryId}/edit`}
        editable
        documentRepository={documentRepository}
        favorites={favorites}
        modelMap={modelMap}
        transcriberMap={transcriberMap}
        workspace={workspaces.find(
          (workspace) => workspace.id === documentRepository.workspaceId,
        )}
      />
    </>
  );
}
