import { getWorkspaceClaims } from "../../../../../../_models/getWorkspaceClaims";
import {
  HeaderMain,
  HeaderMainAsideContent,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { FolderOpen } from "lucide-react";
import { StorageContext } from "../../../../../../_components/StorageContext";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { StorageView } from "../../../../../../_components/StorageView";
import { StorageViewOptionsDropdown } from "../../../../../../_components/StorageViewOptionsDropdown";
import { TabsDocumentRepository } from "../../_components/TabsDocumentRepository";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { list } from "@schornio/aibox-package-database/storage/list";
import { notFound } from "next/navigation";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

const APP_BASE_PATH = "/app/documents/[documentRepositoryId]/files";

export async function Folder({
  path,
  repository: documentRepository,
  view,
}: {
  path: string;
  repository: DocumentRepository;
  view?: string;
}) {
  const [supabase, groupSortViewPreferences] = await Promise.all([
    createSupabaseServerClient(),
    getGroupSortViewPreferences(APP_BASE_PATH),
  ]);

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

  const { data: storageObjects } = await tryAsync(() =>
    list(
      path,
      new StorageSession({
        storage,
        supabaseStorage: supabase.storage,
      }),
    ),
  );

  if (!storageObjects) {
    notFound();
  }
  const resolvedPath = resolvePath(path);
  let columnFolders;
  if ((view ?? groupSortViewPreferences?.view) === "columns") {
    const segments = resolvedPath ? resolvedPath.split("/") : [];
    const ancestorPaths = segments.map((_, index) =>
      segments.slice(0, index).join("/"),
    );
    const { data: ancestors } = await tryAsync(() =>
      Promise.all(
        ancestorPaths.map(async (ancestorPath) => ({
          path: ancestorPath,
          objects: await list(
            ancestorPath,
            new StorageSession({ storage, supabaseStorage: supabase.storage }),
          ),
        })),
      ),
    );
    if (!ancestors) notFound();
    columnFolders = [
      ...ancestors,
      { path: resolvedPath, objects: storageObjects },
    ];
  }

  return (
    <StorageContext
      canWrite={canWrite}
      audioRecording={
        documentRepository.transcriberIdentifier
          ? { appColor: documentRepository.color }
          : undefined
      }
      basePathApp={`/app/documents/${documentRepository.id}/files`}
      basePathStorage={resolvedPath}
      columnFolders={columnFolders}
      id={APP_BASE_PATH}
      storage={storage}
      storageObjects={storageObjects}
      userPreferences={groupSortViewPreferences}
    >
      <HeaderMain appColor={documentRepository.color}>
        <HeaderMainContent>
          <FolderOpen />
          {documentRepository.name}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <StorageViewOptionsDropdown />
        </HeaderMainAsideContent>
      </HeaderMain>

      <TabsDocumentRepository
        documentRepositoryId={documentRepository.id}
        hasFulltextSearch={
          documentRepository.index?.embedding?.active ||
          documentRepository.index?.keyword?.active
        }
        pathSegment="files"
      />

      <StorageView />
    </StorageContext>
  );
}
