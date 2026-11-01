import type { DocumentDatabaseIdentifier } from "./_types.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { tryGetFileAsMDCString } from "./getFile.ts";
import { updateMDC } from "@schornio/aibox-package-markdown-changelog/update";
import { uploadMDC } from "./uploadMDC.ts";

export async function writeFileMDC(
  { fileContent, filePath }: { fileContent: string; filePath: string },
  database: DocumentDatabaseIdentifier,
  storage: { supabaseStorage: SupabaseClient["storage"] },
) {
  const currentFileMDC = await tryGetFileAsMDCString(
    filePath,
    database,
    storage,
  );

  const fileMDC = currentFileMDC
    ? updateMDC(currentFileMDC, fileContent)
    : fileContent;

  await uploadMDC(
    {
      fileMDC,
      filePath,
    },
    database,
    storage,
  );
}
