import type { DocumentDatabaseIdentifier, FileInfo } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { list } from "./list.ts";

export async function tree(
  folderPath: string | undefined,
  database: DocumentDatabaseIdentifier,
  { supabaseStorage }: { supabaseStorage: SupabaseClient["storage"] },
): Promise<FileInfo[]> {
  const { files, folders } = await list(folderPath, database, {
    supabaseStorage,
  });

  const filesInFolders = await Promise.all(
    folders.map((folder) =>
      tree(folder.folderPath.split("/").toSpliced(0, 2).join("/"), database, {
        supabaseStorage,
      }),
    ),
  );

  return [...files, ...filesInFolders.flat()];
}
