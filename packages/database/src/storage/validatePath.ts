import {
  resolvePath,
  normalizePathCharacters,
} from "@schornio/aibox-package-utils/resolvePath";
import {
  EMPTY_FOLDER_PLACEHOLDER,
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
  TEXT_WRITE_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";

export function validateStoragePath(path: string, { allowRoot = false } = {}) {
  if (
    /[\\\u0000-\u001f\u007f]/.test(path) ||
    normalizePathCharacters(path)
      .split("/")
      .some((segment) => segment === "." || segment === "..")
  )
    throw new Error("INVALID_FILE_PATH");
  const normalized = resolvePath(path);
  if (
    (!allowRoot && !normalized) ||
    normalized.length > 1024 ||
    normalized
      .split("/")
      .some(
        (segment) =>
          segment === EMPTY_FOLDER_PLACEHOLDER ||
          segment.endsWith(MDC_FILE_EXTENSION) ||
          segment.endsWith(TEXT_WRITE_FILE_EXTENSION) ||
          segment.endsWith(TRANSCRIPT_FILE_EXTENSION),
      )
  )
    throw new Error("INVALID_FILE_PATH");
  return normalized;
}

export function validateFileName(name: string) {
  if (
    !name.trim() ||
    name !== name.trim() ||
    /[\/\\?%*:|"<>\u0000-\u001f\u007f]/.test(name) ||
    name.length > 200
  )
    throw new Error("INVALID_FILE_NAME");
  return validateStoragePath(name);
}
