import { resourceFileManifestSchema } from "xrag/schema";
import { archivePath } from "xrag/archive";
import {
  normalizePathCharacters,
  resolvePath,
} from "@schornio/aibox-package-utils/resolvePath";
import { validateStoragePath } from "../storage/validatePath.ts";
import type { z } from "zod";
import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
  TEXT_WRITE_FILE_EXTENSION,
  EMPTY_FOLDER_PLACEHOLDER,
} from "../storage/_utils/toStorageObjectArray.ts";
export function validateRepositoryFiles(
  input: z.infer<typeof resourceFileManifestSchema>,
) {
  const files = resourceFileManifestSchema.parse(input);
  const paths = new Set<string>();
  for (const file of files) {
    if (
      archivePath(file.path) !== file.path ||
      /[\x00-\x1f\x7f]/.test(file.path) ||
      normalizePathCharacters(file.path)
        .split("/")
        .some((part) => part === "." || part === "..")
    )
      throw new Error("XRAG_UNSAFE_PATH");
    const path = resolvePath(file.path);
    if (!path || paths.has(path)) throw new Error("XRAG_DUPLICATE_FILE");
    paths.add(path);
    if (path.endsWith(TEXT_WRITE_FILE_EXTENSION))
      throw new Error("XRAG_REPOSITORY_WRITE_PENDING");
    const suffix = [MDC_FILE_EXTENSION, TRANSCRIPT_FILE_EXTENSION].find(
      (ending) => path.endsWith(ending),
    );
    const base = suffix ? path.slice(0, -suffix.length) : path;
    if (base.split("/").at(-1) === EMPTY_FOLDER_PLACEHOLDER)
      validateStoragePath(base.split("/").slice(0, -1).join("/"), {
        allowRoot: true,
      });
    else validateStoragePath(base);
  }
  return files;
}
