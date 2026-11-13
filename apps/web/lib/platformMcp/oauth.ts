import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { platformAccessLevels } from "@schornio/aibox-package-database/mcp/platformAccess";

export const hashCredential = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
export const newCredential = () => randomBytes(32).toString("base64url");

export const authorizationSchema = z.object({
  client_id: z.uuid(),
  redirect_uri: z.url().max(2048),
  response_type: z.literal("code"),
  code_challenge_method: z.literal("S256"),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  resource: z.url().max(2048),
  scope: z
    .string()
    .max(200)
    .optional()
    .refine(
      (scope) =>
        scope === undefined ||
        scope.trim() === "" ||
        scope
          .trim()
          .split(/\s+/)
          .every((level) =>
            platformAccessLevels.includes(
              level as (typeof platformAccessLevels)[number],
            ),
          ),
    ),
  state: z.string().min(1).max(2048),
});

export function validateResource(resource: string, origin: string) {
  if (resource !== `${origin}/mcp`) throw new Error("INVALID_RESOURCE");
}

function validRedirectUri(value: string) {
  const url = new URL(value);
  return (
    !url.hash &&
    !url.username &&
    !url.password &&
    (url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname)))
  );
}

export const registrationSchema = z.object({
  client_name: z.string().trim().min(1).max(200),
  redirect_uris: z
    .array(z.url().max(2048).refine(validRedirectUri))
    .min(1)
    .max(10),
  token_endpoint_auth_method: z.literal("none").default("none"),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .min(1)
    .max(2)
    .refine((grants) => grants.includes("authorization_code"))
    .default(["authorization_code"]),

  response_types: z.array(z.literal("code")).length(1).default(["code"]),
});
