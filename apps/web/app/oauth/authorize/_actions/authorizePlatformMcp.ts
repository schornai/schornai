"use server";
import { z } from "zod";
import { serverActionClient } from "@/lib/serverActionClient";
import { getAuthorizationUser } from "@/lib/platformMcp/getAuthorizationUser";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { validateAuthorization } from "@/lib/platformMcp/validateAuthorization";
import {
  authorizationSchema,
  hashCredential,
  newCredential,
} from "@/lib/platformMcp/oauth";
import {
  requirePlatformAccess,
  platformAccessLevels,
} from "@schornio/aibox-package-database/mcp/platformAccess";
import { createGrant } from "@schornio/aibox-package-database/platformMcp/createGrant";

export const authorizePlatformMcp = serverActionClient
  .inputSchema(
    z.object({
      request: authorizationSchema,
      approve: z.boolean(),
      level: z.enum(platformAccessLevels),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { input } = await validateAuthorization(parsedInput.request);
    const { user, claims } = await getAuthorizationUser();
    const target = new URL(input.redirect_uri);
    target.searchParams.set("state", input.state);
    if (!parsedInput.approve) {
      target.searchParams.set("error", "access_denied");
      return { redirectUrl: target.href };
    }
    requirePlatformAccess(claims, parsedInput.level, parsedInput.level);
    const code = newCredential();
    await createGrant(
      {
        client_id: input.client_id,
        user_id: user.id,
        resource: input.resource,
        access_level: parsedInput.level,
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
