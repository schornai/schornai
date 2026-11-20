import { z } from "zod";
import { xragSchema, resourceFileManifestSchema } from "xrag/schema";
export const PREPARED_BUCKET = "xrag-prepared";
const storedSourceSchema = z.object({ bucket: z.string(), path: z.string() });
const preparedArchiveSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().positive(),
  xrag: xragSchema,
  source: storedSourceSchema.optional(),
  files: z
    .array(
      resourceFileManifestSchema.element.extend({ source: storedSourceSchema }),
    )
    .optional(),
});
export type PreparedArchive = z.infer<typeof preparedArchiveSchema>;
export const preparedEntriesSchema = z
  .array(preparedArchiveSchema)
  .min(1)
  .max(1000);
