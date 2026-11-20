import { identifierFileName } from "xrag/identifier";
import { createReadStream, createWriteStream } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inspectArchive } from "xrag/archive";
import { createCollection } from "xrag/collection";
import type { XRAGSelection } from "./packageSchema.ts";
import { getReferencedXRAGModelIds } from "./getReferencedXRAGModelIds.ts";
import { exportResource } from "./exportResource.ts";
import { getModelExport } from "./getModelExport.ts";
import type { XRAGOptions } from "./authentication.ts";

export async function writeXRAGExport(
  selection: XRAGSelection,
  directory: string,
  options: XRAGOptions,
) {
  const files: string[] = [];
  async function modelFile(id: string) {
    const model = await getModelExport(id, options);
    const file = join(directory, `${model.resourceId}.xrag.tar`);
    await pipeline(
      Readable.fromWeb(
        model.stream as import("node:stream/web").ReadableStream,
      ),
      createWriteStream(file, { flags: "wx" }),
      { signal: options.signal },
    );
    const inspection = await inspectArchive(
      createReadStream(file),
      options.signal,
    );
    if (inspection.id !== model.id) throw new Error("XRAG_CHECKSUM_MISMATCH");
    files.push(file);
    return model.resourceId;
  }
  let resourceId: string;
  if (selection.kind === "model") resourceId = await modelFile(selection.id);
  else {
    const file = join(directory, "resource.xrag.tar");
    const exported = await exportResource(
      selection.kind,
      selection.id,
      file,
      options,
    );
    resourceId = exported.resourceId;
    files.push(file);
    if (selection.includeModels) {
      for (const modelId of await getReferencedXRAGModelIds(file, options)) {
        await modelFile(modelId);
      }
    }
  }
  const name = `${selection.kind}-${identifierFileName(resourceId)}.xrag.tar`;
  let output = files[0]!;
  if (files.length > 1) {
    output = join(directory, "collection.xrag.tar");
    await createCollection(files, output, { signal: options.signal });
  }
  return { path: output, name };
}
