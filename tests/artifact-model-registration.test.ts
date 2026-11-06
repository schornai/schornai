import { createHash } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { registerArtifactModel } from "../packages/database/src/xrag/registerArtifactModel.ts";
import type { XRAG } from "../packages/database/src/xrag/_schema.ts";

const whisper: XRAG = {
  xrag_version: 1,
  xrag_type: "mlxWhisperModel",
  meta: { identifier: "whisper-example", name: "Whisper" },
};
const llm: XRAG = {
  xrag_version: 1,
  xrag_type: "ollamaModel",
  modelName: "example",
  modelTag: "v1",
  meta: {
    identifier: "llm-example",
    name: "Example",
    type: "ollama_llm_v1",
    contextSize: 8192,
    featureThinking: true,
    featureTools: false,
    featureVision: true,
  },
};
const embedding: XRAG = {
  ...llm,
  meta: {
    identifier: "embedding-example",
    name: "Embedding",
    type: "ollama_embedding_v1",
    contextSize: 4096,
    embeddingVectorSize: 768,
  },
};
let query: any;
let bucket: any;
let supabase: any;
beforeEach(() => {
  query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
  bucket = { upload: vi.fn().mockResolvedValue({ error: null }) };
  supabase = {
    from: vi.fn().mockReturnValue(query),
    storage: { from: vi.fn().mockReturnValue(bucket) },
  };
});

it("ignores non-model artifacts without database or storage writes", async () => {
  await expect(
    registerArtifactModel({ xrag_version: 1, xrag_type: "setup" }, new Map(), {
      supabase,
    }),
  ).resolves.toBeUndefined();
  expect(supabase.from).not.toHaveBeenCalled();
  expect(supabase.storage.from).not.toHaveBeenCalled();
});

it("assigns stable Whisper paths and preserves existing installation paths on republishing", async () => {
  const hash = createHash("sha256")
    .update(whisper.meta.identifier)
    .digest("hex");
  await expect(
    registerArtifactModel(whisper, new Map(), { supabase }),
  ).resolves.toBe(hash);
  expect(query.upsert).toHaveBeenLastCalledWith(
    {
      identifier: whisper.meta.identifier,
      name: "Whisper",
      type: "mlx_whisper_v1",
      config: { fileSystemIdentifier: hash },
    },
    { onConflict: "identifier" },
  );
  query.maybeSingle.mockResolvedValue({
    data: {
      type: "mlx_whisper_v1",
      config: { fileSystemIdentifier: "legacy-path" },
    },
    error: null,
  });
  await expect(
    registerArtifactModel(whisper, new Map(), { supabase }),
  ).resolves.toBe("legacy-path");
  expect(query.upsert.mock.calls.at(-1)[0].config).toEqual({
    fileSystemIdentifier: "legacy-path",
  });
});

it.each([
  {
    xrag: llm,
    config: {
      contextSize: 8192,
      ollamaIdentifier: "local_registry.schorn.ai/library/example:v1",
      featureThinking: true,
      featureTools: false,
      featureVision: true,
    },
  },
  {
    xrag: embedding,
    config: {
      contextSize: 4096,
      ollamaIdentifier: "local_registry.schorn.ai/library/example:v1",
      embeddingVectorSize: 768,
    },
  },
])(
  "registers Ollama capabilities according to the model type",
  async ({ xrag, config }) => {
    await expect(
      registerArtifactModel(xrag, new Map(), { supabase }),
    ).resolves.toBeUndefined();
    expect(query.upsert).toHaveBeenCalledWith(
      {
        identifier: xrag.meta.identifier,
        name: xrag.meta.name,
        type: xrag.meta.type,
        config,
      },
      { onConflict: "identifier" },
    );
  },
);

it.each(["png", "jpg", "gif", "webp"])(
  "stores optional %s images with content-derived paths and the correct media type",
  async (extension) => {
    const bytes = Buffer.from("image contents");
    const path = `xrag/${createHash("sha256").update(bytes).digest("hex")}.${extension}`;
    await registerArtifactModel(
      whisper,
      new Map([
        [`image.${extension}`, bytes],
        ["description.md", Buffer.from("Model description")],
      ]),
      { supabase },
    );
    expect(supabase.storage.from).toHaveBeenCalledWith("model_images");
    expect(bucket.upload).toHaveBeenCalledWith(path, bytes, {
      upsert: true,
      contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
    });
    expect(query.upsert.mock.calls[0][0]).toMatchObject({
      description: "Model description",
      image: { path, storage: "model_images", type: "supabase-storage-path" },
    });
  },
);

it.each([
  {
    result: { data: null, error: { message: "secret database details" } },
    expected: "MODEL_READ_FAILED",
  },
  {
    result: { data: { type: "ollama_llm_v1", config: {} }, error: null },
    expected: "MODEL_TYPE_CONFLICT",
  },
])(
  "rejects unreadable or incompatible model records before updating them",
  async ({ result, expected }) => {
    query.maybeSingle.mockResolvedValue(result);
    await expect(
      registerArtifactModel(whisper, new Map(), { supabase }),
    ).rejects.toThrow(expected);
    expect(query.upsert).not.toHaveBeenCalled();
    expect(bucket.upload).not.toHaveBeenCalled();
  },
);

it("does not publish model metadata when its image upload fails", async () => {
  bucket.upload.mockResolvedValue({ error: { message: "storage details" } });
  await expect(
    registerArtifactModel(
      whisper,
      new Map([["image.png", Buffer.from("image")]]),
      { supabase },
    ),
  ).rejects.toThrow("MODEL_IMAGE_FAILED");
  expect(query.upsert).not.toHaveBeenCalled();
});

it("reports a failed model registration without forwarding database details", async () => {
  query.upsert.mockResolvedValue({ error: { message: "database details" } });
  await expect(
    registerArtifactModel(whisper, new Map(), { supabase }),
  ).rejects.toThrow("MODEL_REGISTRATION_FAILED");
});
