import { globalIdentifierSchema } from "./identifier.ts";
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
  ollamaIdentifier: z.string().min(1).max(500).optional(),
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

export const distributionSchema = z.union([
  xragSchemaSetup,
  xragSchemaMLXWhisperModel,
  xragSchemaOllamaModel,
  xragMetaSchema.extend({
    xrag_type: z.literal("files"),
    // Future services opt in by capability name. Files are data, never executed.
    targets: z.array(safeSegment).min(1),
    name: safeSegment,
  }),
]);

export const collectionSchema = z
  .object({
    xrag_version: z.literal(2),
    xrag_type: z.literal("collection"),
    entries: z
      .array(
        z.object({
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          size: z.number().int().positive(),
        }),
      )
      .min(1)
      .max(1000),
  })
  .superRefine(({ entries }, context) => {
    if (new Set(entries.map((entry) => entry.sha256)).size !== entries.length)
      context.addIssue({
        code: "custom",
        message: "Duplicate XRAG collection entry",
      });
  });

export const resourceKindSchema = z.enum([
  "agent",
  "transcriber",
  "documentRepository",
  "automation",
]);

export const resourceSchema = z.object({
  xrag_version: z.literal(2),
  xrag_type: z.literal("resource"),
  resourceType: resourceKindSchema,
  id: globalIdentifierSchema,
  // The database package validates this using the existing domain schemas.
  data: z.record(z.string(), z.unknown()),
  references: z
    .array(
      z.object({
        kind: z.enum(["model", "agent", "transcriber", "documentRepository"]),
        id: globalIdentifierSchema,
        identifier: z.string().min(1),
        externalModel: z
          .object({
            provider: z.string().min(1).max(100),
            modelId: z.string().min(1).max(500),
          })
          .strict()
          .optional(),
      }),
    )
    .max(1000),
});
export type XRAGResource = z.infer<typeof resourceSchema>;

export const resourceFileManifestSchema = z
  .array(
    z.object({
      path: z.string().min(1).max(2048),
      contentType: z
        .string()
        .min(1)
        .max(200)
        .regex(/^[^\r\n]+$/),
      size: z.number().int().nonnegative(),
    }),
  )
  .max(100_000);

export const xragSchema = z.union([
  distributionSchema,
  collectionSchema,
  resourceSchema,
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
    case "files":
      return xrag.targets;
    case "collection":
    case "resource":
      return [];
  }
}
