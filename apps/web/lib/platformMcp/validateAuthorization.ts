import { headers } from "next/headers";
import { getClient } from "@schornio/aibox-package-database/platformMcp/getClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { mcpRequestOrigin } from "@/lib/mcp/requestOrigin";
import { authorizationSchema, validateResource } from "./oauth";

export async function validateAuthorization(value: unknown) {
  const input = authorizationSchema.parse(value);
  const h = await headers();
  const origin = mcpRequestOrigin(
    new Request(`http://${h.get("host")}`, { headers: h }),
  );
  validateResource(input.resource, input.scope, origin);
  const client = await getClient(input.client_id, {
    supabase: createSupabaseServiceRoleClient(),
  });
  if (
    !client ||
    !Array.isArray(client.redirect_uris) ||
    !client.redirect_uris.includes(input.redirect_uri)
  )
    throw new Error("INVALID_CLIENT");
  return { input, client };
}
