import { z } from "zod";

export const connectionInputSchema = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum(["oauth", "brave", "staan"]),
    name: z.string().trim().min(1).max(200),
    clientId: z.string().trim().max(2048).optional(),
    secret: z.string().max(8192).optional(),
    market: z
      .string()
      .regex(/^(?:[a-z]{2}-[a-z]{2})?$/i)
      .optional(),
  })
  .superRefine((input, context) => {
    if (!input.id && !input.secret?.trim())
      context.addIssue({
        code: "custom",
        path: ["secret"],
        message: "Secret required",
      });
    if (!input.id && input.kind === "oauth" && !input.clientId)
      context.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Client ID required",
      });
  });
