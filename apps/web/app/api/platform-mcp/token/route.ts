import { z } from "zod";
import { exchangeCode } from "@schornio/aibox-package-database/platformMcp/exchangeCode";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { hashCredential, newCredential } from "@/lib/platformMcp/oauth";
import { oauthOptions, oauthResponse } from "@/lib/platformMcp/http";
const schema = z.object({
  grant_type: z.literal("authorization_code"),
  client_id: z.uuid(),
  code: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  redirect_uri: z.url(),
  resource: z.url(),
});
export const OPTIONS = oauthOptions;
export async function POST(request: Request) {
  try {
    const input = schema.parse(
      Object.fromEntries(new URLSearchParams(await request.text())),
    );
    const token = newCredential();
    const valid = await exchangeCode(
      {
        p_client_id: input.client_id,
        p_code_hash: hashCredential(input.code),
        p_challenge: hashCredential(input.code_verifier),
        p_redirect_uri: input.redirect_uri,
        p_resource: input.resource,
        p_access_hash: hashCredential(token),
      },
      { supabase: createSupabaseServiceRoleClient() },
    );
    if (!valid) return oauthResponse({ error: "invalid_grant" }, 400);
    return oauthResponse({
      access_token: token,
      token_type: "Bearer",
      expires_in: 3600,
    });
  } catch {
    return oauthResponse({ error: "invalid_request" }, 400);
  }
}
