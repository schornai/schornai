import { STORE_NAME, toPathSegments } from "./_utils.ts";
import type { DocumentDatabaseIdentifier } from "./_types.ts";
import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";

export async function uploadMDC(
  {
    fileMDC,
    filePath,
  }: {
    fileMDC: string;
    filePath: string;
  },
  { databaseId, organizationId }: DocumentDatabaseIdentifier,
  { supabaseStorage }: { supabaseStorage: SupabaseClient["storage"] },
) {
  const storagePath = toPathSegments(
    `${organizationId}/${databaseId}/${filePath}`,
  ).join("/");

  const storePathMDC = `${storagePath}.__xrag_content.mdc`;

  const resultFileMDC = await supabaseStorage
    .from(STORE_NAME)
    .upload(storePathMDC, fileMDC, { upsert: true });

  if (resultFileMDC?.error) throw resultFileMDC.error;
}
