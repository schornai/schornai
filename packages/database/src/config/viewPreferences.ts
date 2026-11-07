import { z } from "zod/mini";

export const preferencesSchema = z.optional(
  z.object({
    group: z.optional(z.string()),
    sort: z.optional(z.string()),
    view: z.optional(z.string()),
  }),
);
