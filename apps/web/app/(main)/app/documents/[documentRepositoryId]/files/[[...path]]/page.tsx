import { File } from "../_components/File";
import { Folder } from "../_components/Folder";
import { StorageSession } from "@schornio/aibox-package-database/storage/_utils/StorageSession";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getDocumentRepositoryById } from "@schornio/aibox-package-database/documentRepositories/getDocumentRepositoryById";
import { inspect } from "@schornio/aibox-package-database/storage/inspect";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page(params: {
  params: Promise<{
    documentRepositoryId: string;
    path?: string[];
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ documentRepositoryId, path: pathSegments }, supabase] =
    await Promise.all([params.params, createSupabaseServerClient()]);

  const { data: documentRepository } = await tryAsync(() =>
    getDocumentRepositoryById(documentRepositoryId, { supabase }),
  );

  if (!documentRepository) {
    notFound();
  }

  const path =
    pathSegments?.map((segment) => decodeURIComponent(segment)).join("/") ??
    "/";
  const searchParams = await params.searchParams;

  const storage = {
    documentRepositoryId,
    type: "documentRepository" as const,
    workspaceId: documentRepository.workspaceId,
  };

  const storageObject = await inspect(
    path,
    new StorageSession({
      storage,
      supabaseStorage: supabase.storage,
    }),
  );

  if (!storageObject) {
    notFound();
  }

  return (
    <>
      {storageObject.file ? (
        <File file={storageObject} repository={documentRepository} />
      ) : undefined}

      {storageObject.folder ? (
        <Folder
          path={path}
          repository={documentRepository}
          view={
            typeof searchParams?.view === "string"
              ? searchParams.view
              : undefined
          }
        />
      ) : undefined}
    </>
  );
}
