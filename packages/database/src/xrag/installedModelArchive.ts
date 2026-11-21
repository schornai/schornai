import { createHash } from "node:crypto";
import { constants, type BigIntStats } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { ollamaModelLocation } from "xrag/ollamaModelLocation";
import {
  safeSegment,
  xragSchemaMLXWhisperModel,
  xragSchemaOllamaModel,
} from "xrag/schema";
import { seekableArchive, type SeekableArchiveEntry } from "xrag/streamArchive";
import type { AIModel, AIModelExternalLLM } from "../aiModel/_types.ts";

const layer = z.object({
  digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  size: z.number().int().nonnegative(),
});
const manifestSchema = z.object({
  config: layer,
  layers: z.array(layer).max(10000),
});
function fileVersion(info: BigIntStats) {
  return [info.dev, info.ino, info.size, info.mtimeNs, info.ctimeNs].join(":");
}

/** Called only after authorizing the model. Roots are operator configuration.
 * Snapshot regular files under the real root, then verify the opened descriptor
 * before and after reading (including resumed requests and the package hash pass). */
export async function installedModelArchive(
  model: Exclude<AIModel, AIModelExternalLLM>,
  identifier: string,
) {
  const home = process.env.SCHORNAI_HOME ?? join(homedir(), ".aibox");
  const entries: SeekableArchiveEntry[] = [];
  const version = createHash("sha256");
  function buffer(path: string, bytes: Buffer) {
    if (bytes.length > 256000 && path !== "manifest.json")
      throw new Error("XRAG_INVALID_METADATA");
    version.update(
      JSON.stringify([path, createHash("sha256").update(bytes).digest("hex")]),
    );
    entries.push({
      path,
      size: bytes.length,
      read: async function* (start, end) {
        yield bytes.subarray(start, end);
      },
    });
  }
  async function file(
    root: string,
    source: string,
    path: string,
    expected?: z.infer<typeof layer>,
  ) {
    const target = join(/* turbopackIgnore: true */ root, source);
    if ((await realpath(/* turbopackIgnore: true */ target)) !== target)
      throw new Error("XRAG_INVALID_MODEL");
    const info = await lstat(/* turbopackIgnore: true */ target, {
      bigint: true,
    });
    const size = Number(info.size);
    if (
      !info.isFile() ||
      !Number.isSafeInteger(size) ||
      size <= 0 ||
      (expected && expected.size !== size)
    )
      throw new Error("XRAG_INVALID_MODEL");
    const stamp = fileVersion(info);
    version.update(JSON.stringify([path, stamp]));
    return {
      path,
      size,
      async *read(start: number, end: number, signal?: AbortSignal) {
        const handle = await open(
          /* turbopackIgnore: true */ target,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
        );
        try {
          const check = async () => {
            if (fileVersion(await handle.stat({ bigint: true })) !== stamp)
              throw new Error("XRAG_SOURCE_CHANGED");
          };
          await check();
          const digest =
            expected && start === 0 && end === size
              ? createHash("sha256")
              : undefined;
          for await (const chunk of handle.createReadStream({
            start,
            end: end - 1,
            highWaterMark: 256 * 1024,
            signal,
            autoClose: false,
          })) {
            digest?.update(chunk);
            yield chunk as Buffer;
          }
          await check();
          if (digest && `sha256:${digest.digest("hex")}` !== expected!.digest)
            throw new Error("XRAG_CHECKSUM_MISMATCH");
        } finally {
          await handle.close();
        }
      },
    };
  }
  const meta = { identifier, name: model.name };
  if (model.type === "mlx_whisper_v1") {
    const dir = safeSegment.parse(model.config.fileSystemIdentifier);
    const root = await realpath(
      /* turbopackIgnore: true */ process.env.MLX_WHISPER_MODELS ??
        join(home, "mlx/whisper/models"),
    );
    buffer(
      "xrag.json",
      Buffer.from(
        JSON.stringify(
          xragSchemaMLXWhisperModel.parse({
            xrag_version: 1,
            xrag_type: "mlxWhisperModel",
            meta,
          }),
        ),
      ),
    );
    for (const name of ["config.json", "weights.npz"])
      entries.push(
        await file(root, join(/* turbopackIgnore: true */ dir, name), name),
      );
    // Model distributions may ship provenance, a licence and a model card image.
    for (const name of [
      "LICENSE",
      "source.json",
      "image.png",
      "image.jpg",
      "image.webp",
      "image.gif",
    ]) {
      try {
        entries.push(
          await file(root, join(/* turbopackIgnore: true */ dir, name), name),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  } else {
    const root = await realpath(
      /* turbopackIgnore: true */ process.env.OLLAMA_MODELS ??
        join(home, "ollama/models"),
    );
    const { ollamaIdentifier, ...config } = model.config;
    const { modelName, modelTag, manifest } =
      ollamaModelLocation(ollamaIdentifier);
    const descriptor = await file(root, join(...manifest), "manifest.json");
    if (descriptor.size > 1024 * 1024) throw new Error("XRAG_INVALID_MODEL");
    const xrag = xragSchemaOllamaModel.parse({
      xrag_version: 1,
      xrag_type: "ollamaModel",
      modelName,
      modelTag,
      ...(ollamaIdentifier ===
      `local_registry.schorn.ai/library/${modelName}:${modelTag}`
        ? {}
        : { ollamaIdentifier }),
      meta: { ...meta, type: model.type, ...config },
    });
    buffer("xrag.json", Buffer.from(JSON.stringify(xrag)));
    const bytes = Buffer.concat(
      await Array.fromAsync(descriptor.read(0, descriptor.size)),
    );
    const parsed = manifestSchema.parse(JSON.parse(bytes.toString("utf8")));
    buffer("manifest.json", bytes);
    const sizes = new Map<string, number>();
    for (const blob of [parsed.config, ...parsed.layers]) {
      if (sizes.has(blob.digest)) {
        if (sizes.get(blob.digest) !== blob.size)
          throw new Error("XRAG_INVALID_MODEL");
        continue;
      }
      sizes.set(blob.digest, blob.size);
      const path = "blobs/" + blob.digest.replace(":", "-");
      entries.push(await file(root, path, path, blob));
    }
  }
  if (model.description)
    buffer("description.md", Buffer.from(model.description));
  const archive = seekableArchive(entries);
  if (archive.size > 200 * 1024 ** 3) throw new Error("XRAG_COLLECTION_LIMIT");
  return { ...archive, version: version.digest("hex") };
}
