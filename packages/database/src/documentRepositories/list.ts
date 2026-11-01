import type { DocumentDatabaseIdentifier, FolderInfo } from "./_types.ts";
import {
  EMPTY_FOLDER_PLACEHOLDER,
  MDC_FILE_EXTENSION,
  STORE_NAME,
  getDocumentPath,
  getFileNameFromMDC,
} from "./_utils.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { mapFile } from "./_mappers.ts";

export async function list(
  folderPath: string | undefined,
  database: DocumentDatabaseIdentifier,
  { supabaseStorage }: { supabaseStorage: SupabaseClient["storage"] },
) {
  const path = getDocumentPath(folderPath, database);
  const { data, error } = await supabaseStorage.from(STORE_NAME).list(path);

  if (error) throw error;

  const rawFolders = data.filter((item) => item.metadata === null);
  const rawFiles = data
    .filter((item) => item.metadata !== null)
    .filter((item) => item.name !== EMPTY_FOLDER_PLACEHOLDER);

  const mdcFiles = new Map(
    rawFiles
      .filter((file) => file.name.endsWith(MDC_FILE_EXTENSION))
      .map((file) => [getFileNameFromMDC(file.name), file]),
  );

  const files = rawFiles
    .filter((file) => !file.name.endsWith(MDC_FILE_EXTENSION))
    .map((file) =>
      mapFile(file, {
        hasMDC: mdcFiles.has(file.name),
        path,
      }),
    );

  const folders = rawFolders.map<FolderInfo>((folder) => ({
    folderPath: `${path}/${folder.name}`,
    name: folder.name,
  }));

  return { files, folders };
}
