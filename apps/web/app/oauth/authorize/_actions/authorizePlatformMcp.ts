"use server";
import { z } from "zod";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { validateAuthorization } from "@/lib/platformMcp/validateAuthorization";
import {
  authorizationSchema,
  hashCredential,
  newCredential,
} from "@/lib/platformMcp/oauth";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { requirePlatformAccess } from "@schornio/aibox-package-database/mcp/platformAccess";
import { createGrant } from "@schornio/aibox-package-database/platformMcp/createGrant";

export const authorizePlatformMcp = serverActionClient
  .inputSchema(z.object({ request: authorizationSchema, approve: z.boolean() }))
  .action(async ({ parsedInput }) => {
    const { input } = await validateAuthorization(parsedInput.request);
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });
    const target = new URL(input.redirect_uri);
    target.searchParams.set("state", input.state);
    if (!parsedInput.approve) {
      target.searchParams.set("error", "access_denied");
      return { redirectUrl: target.href };
    }
    const claims = await getCurrentUserClaims({ supabaseAuth: supabase.auth });
    requirePlatformAccess(claims, input.scope, "user");
    const code = newCredential();
    await createGrant(
      {
        client_id: input.client_id,
        user_id: user.id,
        resource: input.resource,
        access_level: input.scope,
        redirect_uri: input.redirect_uri,
        challenge: input.code_challenge,
        code_hash: hashCredential(code),
        code_expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      },
      { supabase: createSupabaseServiceRoleClient() },
    );
    target.searchParams.set("code", code);
    return { redirectUrl: target.href };
  });
