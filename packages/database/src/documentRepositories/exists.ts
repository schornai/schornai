import { MDC_FILE_EXTENSION, STORE_NAME, getDocumentPath } from "./_utils.ts";
import type { FileParams } from "./_types.ts";

export async function exists(...fileParams: FileParams) {
  const [filePath, database, { supabaseStorage }] = fileParams;

  const { data } = await supabaseStorage
    .from(STORE_NAME)
    .exists(getDocumentPath(filePath, database));

  return data;
}

export async function existsMDC(...fileParams: FileParams) {
  const [filePath, database, { supabaseStorage }] = fileParams;

  const { data } = await supabaseStorage
    .from(STORE_NAME)
    .exists(`${getDocumentPath(filePath, database)}${MDC_FILE_EXTENSION}`);

  return data;
}
