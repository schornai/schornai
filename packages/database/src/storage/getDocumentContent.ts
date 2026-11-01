import {
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./_utils/toStorageObjectArray.ts";
import {
  fileNeedsProcessing,
  getFileCategory,
} from "@schornio/aibox-package-utils/getFileTypeLabel";
import type { MDC } from "@schornio/aibox-package-markdown-changelog/types";
import { getDocumentBlob } from "./getDocumentBlob.ts";
import { parseMDC } from "@schornio/aibox-package-markdown-changelog/parse";
import { transcriptionSchema } from "./_schemas.ts";
import { trySync } from "@schornio/aibox-package-utils/trySync";

export async function getDocumentContent(
  ...[path, ...params]: Parameters<typeof getDocumentBlob>
) {
  const fileContentLocation = fileNeedsProcessing(path);

  if (fileContentLocation === "text") {
    const blob = await getDocumentBlob(
      `${path}${MDC_FILE_EXTENSION}`,
      ...params,
    );
    const mdcString = await blob?.text();
    return mdcString
      ? { ...parseMDC(mdcString), type: "mdc" as const }
      : ["plain-text", "code"].includes(getFileCategory(path))
        ? {
            current:
              (await (await getDocumentBlob(path, ...params))?.text()) ?? "",
            type: "mdc" as const,
            versions: [],
          }
        : undefined;
  }

  if (fileContentLocation === "transcript") {
    const blob = await getDocumentBlob(
      `${path}${TRANSCRIPT_FILE_EXTENSION}`,
      ...params,
    );
    const transcriptString = await blob?.text();
    const transcript = transcriptionSchema.safeParse(
      trySync(() => JSON.parse(transcriptString ?? "")).data,
    ).data;
    return transcript
      ? { ...transcript, type: "transcript" as const }
      : undefined;
  }

  const fileCategory = getFileCategory(path);

  if (fileCategory === "plain-text" || fileCategory === "code") {
    const blobMDC = await getDocumentBlob(
      `${path}${MDC_FILE_EXTENSION}`,
      ...params,
    );

    if (blobMDC) {
      const mdcString = await blobMDC.text();
      return { ...parseMDC(mdcString), type: "mdc" as const };
    } else {
      const blob = await getDocumentBlob(path, ...params);
      const text = await blob?.text();

      return text !== undefined
        ? ({
            current: text,
            type: "mdc",
            versions: [],
          } satisfies MDC & { type: "mdc" })
        : undefined;
    }
  }

  return undefined;
}
