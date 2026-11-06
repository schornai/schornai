import { z } from "zod/mini";
import { getFileCategory } from "@schornio/aibox-package-utils/getFileTypeLabel";
import type { SupabaseStorageAPI } from "../../_shared/_types.ts";
import {
  MDC_FILE_EXTENSION,
  TEXT_WRITE_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "./toStorageObjectArray.ts";

const blobSchema = z.object({ base64: z.string(), type: z.string() });
const journalSchema = z.object({
  version: z.literal(1),
  original: blobSchema,
  sidecar: z.nullable(blobSchema),
});
export type TextWriteJournal = z.infer<typeof journalSchema>;

export function isTextFile(path: string) {
  return (
    ![
      MDC_FILE_EXTENSION,
      TEXT_WRITE_FILE_EXTENSION,
      TRANSCRIPT_FILE_EXTENSION,
    ].some((suffix) => path.endsWith(suffix)) &&
    ["plain-text", "code"].includes(getFileCategory(path))
  );
}

export async function encodeBlob(blob: Blob) {
  return {
    base64: Buffer.from(await blob.arrayBuffer()).toString("base64"),
    type: blob.type,
  };
}

export function decodeBlob(blob: z.infer<typeof blobSchema>) {
  return new Blob([Buffer.from(blob.base64, "base64")], { type: blob.type });
}

export async function readStorageBlob(
  path: string,
  storage: SupabaseStorageAPI,
  signal: AbortSignal,
) {
  const { data, error } = await storage.download(path, undefined, { signal });
  // Storage returns HTTP 400 with statusCode "404" for absent objects.
  if (error && error.statusCode !== "404") throw error;
  return data ?? undefined;
}

export async function readTextWriteJournal(
  path: string,
  storage: SupabaseStorageAPI,
  signal: AbortSignal,
) {
  if (!isTextFile(path)) return undefined;
  const blob = await readStorageBlob(
    path + TEXT_WRITE_FILE_EXTENSION,
    storage,
    signal,
  );
  return blob ? journalSchema.parse(JSON.parse(await blob.text())) : undefined;
}

export async function restoreTextWriteJournal(
  path: string,
  journal: TextWriteJournal,
  storage: SupabaseStorageAPI,
  signal: AbortSignal,
) {
  for (const [suffix, backup] of [
    ["", journal.original],
    [MDC_FILE_EXTENSION, journal.sidecar],
  ] as const) {
    signal.throwIfAborted();
    const { error } = backup
      ? await storage.upload(path + suffix, decodeBlob(backup), {
          upsert: true,
        })
      : await storage.remove([path + suffix]);
    if (error) throw error;
  }
  signal.throwIfAborted();
  const { error } = await storage.remove([path + TEXT_WRITE_FILE_EXTENSION]);
  if (error) throw error;
}
