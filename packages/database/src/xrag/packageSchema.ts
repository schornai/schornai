import { z } from "zod";
import { resourceKindSchema } from "xrag/schema";
export const packageObjectSchema = z.strictObject({
  kind: z.union([resourceKindSchema, z.literal("model")]),
  id: z.string().min(1).max(200),
});
export const xragSelectionSchema = z.object({
  ...packageObjectSchema.shape,
  includeModels: z.boolean().optional(),
});
export const packageIdSchema = z.object({ packageId: z.uuid() });
export const packageItemSchema = packageIdSchema.extend({
  selection: packageObjectSchema,
});

export type XRAGSelection = z.infer<typeof xragSelectionSchema>;
export type XRAGPackageObject = z.infer<typeof packageObjectSchema> & {
  name: string;
};
export const addXRAGPackageItemSchema = packageItemSchema.extend({
  related: z.array(packageObjectSchema).max(999).optional(),
});
