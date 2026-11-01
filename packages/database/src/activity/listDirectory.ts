import {
  EMPTY_FOLDER_PLACEHOLDER,
  MDC_FILE_EXTENSION,
} from "../documentRepositories/_utils.ts";
import { STORE_NAME } from "./_utils.ts";
import type { SupabaseClient } from "../_shared/_types.ts";
import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

export async function listDirectory(
  path: string,
  activityId: string,
  {
    abortSignal,
    supabaseStorage,
  }: { abortSignal?: AbortSignal; supabaseStorage: SupabaseClient["storage"] },
) {
  const repoPath = resolvePath(path);

  const { data, error } = await supabaseStorage
    .from(STORE_NAME)
    .list(
      `${activityId}/${repoPath}`,
      { limit: 10_000 },
      { signal: abortSignal },
    );

  if (error) throw error;

  return data
    .filter((item) => item.name !== EMPTY_FOLDER_PLACEHOLDER)
    .filter((file) => !file.name.endsWith(MDC_FILE_EXTENSION))
    .map((fileObject) => ({
      name: fileObject.name,
      path: `${repoPath}/${fileObject.name}`,
      ...(fileObject.metadata
        ? {
            file: true as const,
            size: fileObject.metadata.size,
            type: fileObject.metadata.mimetype,
          }
        : { directory: true as const }),
    }))
    .toSorted((a, b) => a.path.localeCompare(b.path));
}
