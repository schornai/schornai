import { z } from "zod";
import { externalModelProviderSchema } from "./_schema.ts";

export const externalModelInputSchema = z
  .object({
    provider: externalModelProviderSchema.default("openai-compatible"),
    region: z
      .string()
      .regex(/^[a-z]{2}(?:-[a-z]+)+-\d+$/)
      .optional(),
    contextSize: z
      .number()
      .int()
      .positive()
      .max(2147483647)
      .nullable()
      .optional(),
    name: z.string().trim().min(1).max(500),
    modelId: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .regex(/^[^\r\n]+$/),
    baseUrl: z
      .string()
      .trim()
      .max(500)
      .url()
      .refine((value) => {
        let url: URL;
        try {
          url = new URL(value);
        } catch {
          return false;
        }
        return (
          url.protocol === "https:" &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash
        );
      })
      .transform((value) => value.replace(/\/+$/, "")),
    apiKey: z
      .string()
      .trim()
      .max(4096)
      .regex(/^[^\r\n]*$/),
  })
  .refine(
    (value) => value.provider !== "antropic-aws" || Boolean(value.region),
    { path: ["region"], message: "REGION_REQUIRED" },
  );
