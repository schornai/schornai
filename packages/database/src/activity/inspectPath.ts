import { STORE_NAME } from "./_utils.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";
import { toStorageObjectArray } from "../storage/_utils/toStorageObjectArray.ts";

export async function inspectPath(
  path: string,
  activityId: string,
  {
    abortSignal,
    supabaseStorage,
  }: { abortSignal?: AbortSignal; supabaseStorage: SupabaseClient["storage"] },
) {
  const repoPath = resolvePath(path);
  const repoPathSegments = repoPath.split("/");
  const parent = repoPathSegments.slice(0, -1).join("/");
  const name = repoPathSegments.at(-1);

  const { data, error } = await supabaseStorage
    .from(STORE_NAME)
    .list(
      `${activityId}/${parent}`,
      { limit: 1, search: name },
      { signal: abortSignal },
    );

  if (error) throw error;

  return toStorageObjectArray(repoPath, data).find(
    (fileObject) => fileObject.name === name,
  );
}
