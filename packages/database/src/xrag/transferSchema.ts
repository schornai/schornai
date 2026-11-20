import { globalIdentifierSchema } from "xrag/identifier";
import { z } from "zod";

export const XRAG_TRANSFER_BUCKET = "xrag-transfers";
export const transferPathSchema = z
  .string()
  .max(310)
  .refine((path) => {
    const parts = path.split("/");
    return (
      parts.length === 3 &&
      z.uuid().safeParse(parts[0]).success &&
      z.uuid().safeParse(parts[1]).success &&
      !!parts[2] &&
      ![".", ".."].includes(parts[2]) &&
      !/[\\\x00-\x1f]/.test(parts[2])
    );
  });
const importTargetSchema = z.object({
  workspaceId: z.string().min(1).max(100),
  newWorkspaceName: z.string().trim().min(1).max(200).optional(),
});
export const transferSourceSchema = z.object({
  path: transferPathSchema,
  digest: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export const importPreviewInputSchema = z.object({
  source: transferSourceSchema,
  target: importTargetSchema.optional(),
  selectedEntries: z
    .array(z.string().regex(/^[a-f0-9]{64}$/))
    .min(1)
    .max(1000)
    .optional(),
});
export const importTransferInputSchema = importPreviewInputSchema.extend({
  source: transferSourceSchema.extend({
    digest: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  modelSelections: z
    .record(z.string().min(1).max(500), z.string().min(1).max(500))
    .optional(),
  confirmedRevisions: z.record(
    globalIdentifierSchema,
    z.string().regex(/^[a-f0-9]{32}$/),
  ),
});
