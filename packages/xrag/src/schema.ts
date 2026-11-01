import { z } from "zod/v4";

export const safeSegment = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
  .refine((value) => value !== ".." && value !== ".");
const modelName = z
  .string()
  .min(1)
  .refine((value) =>
    value.split("/").every((part) => safeSegment.safeParse(part).success),
  );

export const xragMetaSchema = z.object({
  xrag_version: z.literal(1),
});

export const xragSchemaSetup = xragMetaSchema.extend({
  xrag_type: z.literal("setup"),
  platform: z.enum(["darwin", "linux"]).optional(),
  arch: z.enum(["arm64", "x64"]).optional(),
});

export const xragSchemaCertificate = xragMetaSchema.extend({
  xrag_type: z.literal("certificate"),
});

export const xragSchemaSiteURL = xragMetaSchema.extend({
  siteUrl: z.string(),
  xrag_type: z.literal("site_url"),
});

export const xragSchemaOllamaModel = xragMetaSchema.extend({
  meta: z.union([
    z.object({
      contextSize: z.number().positive().int(),
      featureThinking: z.boolean(),
      featureTools: z.boolean(),
      featureVision: z.boolean(),
      identifier: z.string(),
      name: z.string(),
      type: z.literal("ollama_llm_v1"),
    }),
    z.object({
      contextSize: z.number().positive().int(),
      embeddingVectorSize: z.union([
        z.literal(384),
        z.literal(768),
        z.literal(1024),
        z.literal(1536),
      ]),
      identifier: z.string(),
      name: z.string(),
      type: z.literal("ollama_embedding_v1"),
    }),
  ]),
  modelName,
  modelTag: safeSegment,
  xrag_type: z.literal("ollamaModel"),
});

export const xragSchemaMLXWhisperModel = xragMetaSchema.extend({
  meta: z.object({
    identifier: z.string(),
    name: z.string(),
  }),
  xrag_type: z.literal("mlxWhisperModel"),
});

export const xragSchema = z.union([
  xragSchemaSetup,
  xragSchemaCertificate,
  xragSchemaMLXWhisperModel,
  xragSchemaSiteURL,
  xragSchemaOllamaModel,
  xragMetaSchema.extend({
    xrag_type: z.literal("files"),
    // Future services opt in by capability name. Files are data, never executed.
    targets: z.array(safeSegment).min(1),
    name: safeSegment,
  }),
]);

export type XRAG = z.infer<typeof xragSchema>;
export const artifactSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
  size: z.number().int().positive(),
  // The distribution protocol can carry future types/versions. Publication and
  // each consumer still validate against their own supported installers.
  xrag: z
    .object({
      xrag_version: z.number().int().positive(),
      xrag_type: safeSegment,
    })
    .passthrough(),
  fileSystemIdentifier: safeSegment.optional(),
  // Keep small tombstones after deleting the archive. A withdrawn latest setup
  // must never make an older release become current again.
  deletedAt: z.iso.datetime().optional(),
  purgedAt: z.iso.datetime().optional(),
});
export type Artifact = z.infer<typeof artifactSchema>;
export const catalogSchema = z.object({
  artifacts: z.array(artifactSchema),
  nextOffset: z.number().int().nonnegative().nullable(),
});

export function artifactTargets(metadata: unknown): string[] {
  const parsed = xragSchema.safeParse(metadata);
  if (!parsed.success) return [];
  const xrag = parsed.data;
  switch (xrag.xrag_type) {
    case "setup":
      return ["service"];
    case "mlxWhisperModel":
      return ["transcriber-mlx"];
    case "ollamaModel":
      return ["ollama"];
    case "certificate":
      return ["core", "supabase"];
    case "site_url":
      return ["core", "supabase"];
    case "files":
      return xrag.targets;
  }
}
