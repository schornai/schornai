import { z } from "zod";

export const connectionInputSchema = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum(["oauth", "brave", "staan"]),
    name: z.string().trim().min(1).max(200),
    issuer: z
      .string()
      .trim()
      .max(2048)
      .refine((value) => {
        try {
          const url = new URL(value);
          const loopback =
            ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
            url.hostname.endsWith(".localhost");
          return (
            (url.protocol === "https:" ||
              (url.protocol === "http:" && loopback)) &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash
          );
        } catch {
          return false;
        }
      }, "Valid OAuth issuer URL required")
      .optional(),
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
    if (!input.id && input.kind === "oauth" && !input.issuer)
      context.addIssue({
        code: "custom",
        path: ["issuer"],
        message: "OAuth issuer required",
      });
    if (!input.id && input.kind === "oauth" && !input.clientId)
      context.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "Client ID required",
      });
  });
