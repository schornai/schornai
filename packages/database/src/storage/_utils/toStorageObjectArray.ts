import type { StorageObject, StorageObjectReadableContent } from "../_types.ts";
import type { SupabaseFileObject } from "../../_shared/_types.ts";
import { omitNullish } from "@schornio/aibox-package-utils/omitNullish";

export const EMPTY_FOLDER_PLACEHOLDER = ".empty-folder-placeholder";
export const MDC_FILE_EXTENSION = ".__xrag_content.mdc";
export const TRANSCRIPT_FILE_EXTENSION = ".__xrag_transcript.json";
export const TEXT_WRITE_FILE_EXTENSION = ".__xrag_text_write.json";

function getReadableContent(
  fileName: string,
): [string, StorageObjectReadableContent] | undefined {
  if (fileName.endsWith(MDC_FILE_EXTENSION)) {
    const baseFileName = fileName.substring(
      0,
      fileName.length - MDC_FILE_EXTENSION.length,
    );
    return [baseFileName, "text"];
  }

  if (fileName.endsWith(TRANSCRIPT_FILE_EXTENSION)) {
    const baseFileName = fileName.substring(
      0,
      fileName.length - TRANSCRIPT_FILE_EXTENSION.length,
    );
    return [baseFileName, "transcript"];
  }

  return undefined;
}

export function toStorageObjectArray(
  resolvedPath: string,
  data: SupabaseFileObject[],
  config?: {
    showAll?: boolean;
  },
): StorageObject[] {
  const readableContent = new Map(
    data.map((file) => getReadableContent(file.name)).filter(omitNullish),
  );

  const filteredData = config?.showAll
    ? data
    : data
        .filter((item) => item.name !== EMPTY_FOLDER_PLACEHOLDER)
        .filter((file) => !file.name.endsWith(MDC_FILE_EXTENSION))
        .filter((file) => !file.name.endsWith(TEXT_WRITE_FILE_EXTENSION))
        .filter((file) => !file.name.endsWith(TRANSCRIPT_FILE_EXTENSION));

  return filteredData.map((fileObject) => ({
    name: fileObject.name,
    path:
      resolvedPath === ""
        ? fileObject.name
        : `${resolvedPath}/${fileObject.name}`,
    ...(fileObject.metadata
      ? {
          createdAtISO: new Date(fileObject.created_at ?? 0).toISOString(),
          file: true as const,
          readableContent: readableContent.get(fileObject.name),
          size: fileObject.metadata.size,
          type: fileObject.metadata.mimetype,
          updatedAtISO: new Date(fileObject.updated_at ?? 0).toISOString(),
        }
      : { folder: true as const }),
  }));
}
