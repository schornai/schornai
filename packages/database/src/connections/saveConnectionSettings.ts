import type { SupabaseClient } from "../_shared/_types.ts";
import type { z } from "zod";
import { connectionInputSchema } from "./connectionInputSchema.ts";
import { getConnectionCredentials } from "./getConnectionCredentials.ts";
import { saveConnection } from "./saveConnection.ts";
/** Server-only. Caller must authorize a global administrator. Retains stored
 * credentials and enforces immutable OAuth identity across UI and MCP callers. */
export async function saveConnectionSettings(
  input: z.infer<typeof connectionInputSchema>,
  options: { supabase: SupabaseClient },
) {
  const current = input.id
    ? await getConnectionCredentials(input.id, options)
    : null;
  if (input.id && !current) throw new Error("CONNECTION_NOT_FOUND");
  if (current && current.kind !== input.kind)
    throw new Error("CONNECTION_KIND_IMMUTABLE");
  const editingOAuth = current?.kind === "oauth";
  if (
    editingOAuth &&
    ((input.clientId !== undefined && input.clientId !== current.client_id) ||
      (current.issuer &&
        input.issuer !== undefined &&
        input.issuer !== current.issuer) ||
      input.secret)
  )
    throw new Error("OAUTH_CREDENTIALS_IMMUTABLE");
  const issuer =
    input.kind === "oauth" ? (current?.issuer ?? input.issuer) : null;
  if (input.kind === "oauth" && !issuer)
    throw new Error("OAUTH_ISSUER_REQUIRED");
  const clientId =
    input.kind === "oauth" ? (current?.client_id ?? input.clientId) : null;
  const secret = editingOAuth
    ? current.secret
    : input.secret || current?.secret;
  if (!secret?.trim() || (input.kind === "oauth" && !clientId))
    throw new Error("CONNECTION_CREDENTIALS_REQUIRED");
  const id = input.id ?? crypto.randomUUID();
  await saveConnection(
    {
      id,
      name: input.name,
      kind: input.kind,
      client_id: clientId ?? null,
      issuer: issuer ?? null,
      secret,
      market: input.kind === "staan" ? input.market || null : null,
    },
    options,
  );
  return { id };
}
