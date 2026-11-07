import { z } from "zod";
import { revokeGrant } from "@schornio/aibox-package-database/platformMcp/revokeGrant";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { hashCredential } from "@/lib/platformMcp/oauth";
import { oauthOptions, oauthResponse } from "@/lib/platformMcp/http";
export const OPTIONS = oauthOptions;
export async function POST(request: Request) {
  try {
    const input = z
      .object({ client_id: z.uuid(), token: z.string().max(4096) })
      .parse(Object.fromEntries(new URLSearchParams(await request.text())));
    await revokeGrant(hashCredential(input.token), input.client_id, {
      supabase: createSupabaseServiceRoleClient(),
    });
    return oauthResponse({});
  } catch {
    return oauthResponse({ error: "invalid_request" }, 400);
  }
}
