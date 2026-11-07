import { registerClient } from "@schornio/aibox-package-database/platformMcp/registerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { registrationSchema } from "@/lib/platformMcp/oauth";
import {
  oauthOptions,
  oauthResponse,
  readOAuthBody,
} from "@/lib/platformMcp/http";
export const OPTIONS = oauthOptions;
export async function POST(request: Request) {
  try {
    const metadata = registrationSchema.parse(
      JSON.parse(await readOAuthBody(request)),
    );
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
