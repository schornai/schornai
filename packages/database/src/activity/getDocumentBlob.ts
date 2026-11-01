import { STORE_NAME } from "./_utils.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

/** @deprecated alles nach storage umgezogen */
export async function getDocumentBlob(
  path: string,
  activityId: string,
  {
    abortSignal,
    supabaseStorage,
  }: { abortSignal?: AbortSignal; supabaseStorage: SupabaseClient["storage"] },
) {
  const { data, error } = await supabaseStorage
    .from(STORE_NAME)
    .download(`${activityId}/${resolvePath(path)}`, undefined, {
      signal: abortSignal,
    });

  if (error) throw error;

  return data;
}
