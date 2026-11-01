import { createHmac } from "node:crypto";

/** Generates the legacy HS256 API keys expected by self-hosted Supabase. */
export function generateSupabaseKey(
  type: "ANON_KEY" | "SERVICE_ROLE_KEY",
  jwtSecret: string,
) {
  if (jwtSecret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
  if (type !== "ANON_KEY" && type !== "SERVICE_ROLE_KEY")
    throw new Error("Invalid Supabase key type");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fiveYears = new Date(
    now.getFullYear() + 5,
    now.getMonth(),
    now.getDate(),
  );
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      role: type === "ANON_KEY" ? "anon" : "service_role",
      iss: "supabase",
      iat: Math.floor(today.valueOf() / 1000),
      exp: Math.floor(fiveYears.valueOf() / 1000),
    }),
  ).toString("base64url");
  const signed = `${header}.${payload}`;
  const signature = createHmac("sha256", jwtSecret)
    .update(signed)
    .digest("base64url");
  return `${signed}.${signature}`;
}
