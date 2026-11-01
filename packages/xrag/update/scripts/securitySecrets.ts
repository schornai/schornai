import { randomBytes } from "node:crypto";
import { chmod, readFile, appendFile } from "node:fs/promises";
import { parseEnv } from "node:util";

export function generateSecuritySecrets() {
  return {
    SERVICE_API_TOKEN: randomBytes(32).toString("hex"),
    REALTIME_SERVER_SECRET: randomBytes(32).toString("hex"),
    SUPABASE_AUTH_HOOK_SECRET: `v1,whsec_${randomBytes(32).toString("base64")}`,
  };
}

/** Add missing secrets on upgrades, preserving keys already used by the box. */
export async function ensureSecuritySecrets(envPath: string) {
  const env = parseEnv(await readFile(envPath, "utf8"));
  const generated = generateSecuritySecrets();
  const additions: string[] = [];

  for (const key of Object.keys(generated) as (keyof typeof generated)[]) {
    const value = env[key];
    if (!value) {
      additions.push(`${key}=${generated[key]}`);
      continue;
    }

    const valid =
      key !== "SUPABASE_AUTH_HOOK_SECRET"
        ? value.length >= 32 && !/\s/.test(value)
        : /^v1,whsec_[A-Za-z0-9+/]+={0,2}$/.test(value) &&
          Buffer.from(value.slice("v1,whsec_".length), "base64").length >= 32;
    if (!valid) {
      throw new Error(`Invalid ${key} in box configuration`);
    }
  }

  // Restrict the existing file before appending credentials. Never log its data.
  await chmod(envPath, 0o600);
  if (additions.length) {
    await appendFile(envPath, `\n${additions.join("\n")}\n`, "utf8");
  }
}
