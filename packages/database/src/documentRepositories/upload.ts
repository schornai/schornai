import { STORE_NAME, getDocumentPath } from "./_utils.ts";
import type { DocumentDatabaseIdentifier } from "./_types.ts";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import { sanitizeFileName } from "../_util/sanitizeFileName.ts";

export async function upload(
  {
    file,
    fileMDC,
    folderPath,
  }: {
    file: File;
    fileMDC?: string;
    folderPath?: string;
  },
  databaseIdentifier: DocumentDatabaseIdentifier,
  { supabaseStorage }: { supabaseStorage: SupabaseClient["storage"] },
) {
  const storePath = getDocumentPath(
    `${folderPath ?? ""}/${sanitizeFileName(file.name)}`,
    databaseIdentifier,
  );
  const storePathMDC = `${storePath}.__xrag_content.mdc`;

  const [resultFile, resultFileMDC] = await Promise.all([
    supabaseStorage.from(STORE_NAME).upload(storePath, file, { upsert: true }),
    fileMDC
      ? supabaseStorage
          .from(STORE_NAME)
          .upload(storePathMDC, fileMDC, { upsert: true })
      : undefined,
  ]);

  if (resultFile.error) throw resultFile.error;
  if (resultFileMDC?.error) throw resultFileMDC.error;

  return resultFile.data.fullPath;
}
