import { registerClient } from "@schornio/aibox-package-database/platformMcp/registerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { registrationSchema } from "@/lib/platformMcp/oauth";
import { oauthOptions, oauthResponse } from "@/lib/platformMcp/http";
export const OPTIONS = oauthOptions;
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 32768)
    return oauthResponse({ error: "invalid_client_metadata" }, 400);
  try {
    const metadata = registrationSchema.parse(await request.json());
    const clientId = await registerClient(
      metadata.client_name,
      metadata.redirect_uris,
      { supabase: createSupabaseServiceRoleClient() },
    );
    return oauthResponse({ ...metadata, client_id: clientId }, 201);
  } catch {
    return oauthResponse({ error: "invalid_client_metadata" }, 400);
  }
}
