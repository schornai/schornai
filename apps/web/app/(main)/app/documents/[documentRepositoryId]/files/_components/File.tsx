import { StorageFileActions } from "../../../../../../_components/StorageFileActions";
import { notFound } from "next/navigation";
import { getWorkspaceClaims } from "../../../../../../_models/getWorkspaceClaims";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { FolderOpen } from "lucide-react";
import { StorageBreadcrumbs } from "../../../../../../_components/StorageBreadcrumbs";
import { StorageFilePreview } from "../../../../../../_components/StorageFilePreview";
import type { StorageObject } from "@schornio/aibox-package-database/storage/_types";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getDocumentContent } from "@schornio/aibox-package-database/storage/getDocumentContent";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export async function File({
  file,
  repository: documentRepository,
}: {
  file: StorageObject;
  repository: DocumentRepository;
}) {
  const [supabase] = await Promise.all([createSupabaseServerClient()]);

  const workspaceClaims = await getWorkspaceClaims();
  const canWrite =
    workspaceClaims.isAdmin ||
    workspaceClaims.claims.some(
      (claim) =>
        claim.id === documentRepository.workspaceId &&
        ["editor", "workspace-admin", "admin"].includes(claim.claim ?? ""),
    );

  const storage = {
    documentRepositoryId: documentRepository.id,
    type: "documentRepository" as const,
    workspaceId: documentRepository.workspaceId,
  };

  const storageSession = new StorageSession({
    storage,
    supabaseStorage: supabase.storage,
  });

  const { data: content, error } = await tryAsync(() =>
    getDocumentContent(file.path, storageSession),
  );

  if (error) notFound();

  return (
    <>
      <HeaderMain appColor={documentRepository.color}>
        <HeaderMainContent>
          <FolderOpen />
          {documentRepository.name}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          {file.file && (
            <StorageFileActions
              file={file}
              storage={storage}
              canWrite={canWrite}
              navigateAfterChange
              options
              editable={content !== undefined}
            />
          )}
        </HeaderMainAsideContent>
      </HeaderMain>

      <ContainerMain>
        <StorageBreadcrumbs
          basePathApp={`/app/documents/${documentRepository.id}/files`}
          path={file.path}
        />

        <StorageFilePreview
          detailView
          canWrite={canWrite}
          fileContent={content}
          fileObject={file}
          storage={storage}
        />
      </ContainerMain>
    </>
  );
}
