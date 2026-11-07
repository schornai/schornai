import { z } from "zod";
import { revokeGrant } from "@schornio/aibox-package-database/platformMcp/revokeGrant";
import { getGrant } from "@schornio/aibox-package-database/platformMcp/getGrant";
import { exchangeCode } from "@schornio/aibox-package-database/platformMcp/exchangeCode";
import { refreshTokens } from "@schornio/aibox-package-database/platformMcp/refreshTokens";
import { platformAccessLevels } from "@schornio/aibox-package-database/mcp/platformAccess";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { hashCredential, newCredential } from "@/lib/platformMcp/oauth";
import {
  oauthOptions,
  oauthResponse,
  readOAuthBody,
} from "@/lib/platformMcp/http";
const credential = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const common = { client_id: z.uuid(), resource: z.url() };
const schema = z.discriminatedUnion("grant_type", [
  z.object({
    ...common,
    grant_type: z.literal("authorization_code"),
    code: credential,
    code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
    redirect_uri: z.url(),
  }),
  z.object({
    ...common,
    grant_type: z.literal("refresh_token"),
    refresh_token: credential,
    scope: z.enum(platformAccessLevels).optional(),
  }),
]);
export const OPTIONS = oauthOptions;
export async function POST(request: Request) {
  try {
    const input = schema.parse(
      Object.fromEntries(new URLSearchParams(await readOAuthBody(request))),
    );
    const token = newCredential();
    const refreshToken = newCredential();
    const options = { supabase: createSupabaseServiceRoleClient() };
    const scope =
      input.grant_type === "authorization_code"
        ? await exchangeCode(
            {
              p_client_id: input.client_id,
              p_code_hash: hashCredential(input.code),
              p_challenge: hashCredential(input.code_verifier),
              p_redirect_uri: input.redirect_uri,
              p_resource: input.resource,
              p_access_hash: hashCredential(token),
              p_refresh_hash: hashCredential(refreshToken),
            },
            options,
          )
        : await refreshTokens(
            {
              p_client_id: input.client_id,
              p_refresh_hash: hashCredential(input.refresh_token),
              p_access_hash: hashCredential(token),
              p_next_refresh_hash: hashCredential(refreshToken),
              p_resource: input.resource,
              ...(input.scope ? { p_scope: input.scope } : {}),
            },
            options,
          );
    if (!scope) return oauthResponse({ error: "invalid_grant" }, 400);
    const grant = await getGrant(
      hashCredential(token),
      input.resource,
      options,
    );
    if (!grant?.access_expires_at)
      return oauthResponse({ error: "invalid_grant" }, 400);
    const { data, error } = await options.supabase.auth.admin.getUserById(
      grant.user_id,
    );
    if (
      error ||
      !data.user ||
      (data.user.banned_until && new Date(data.user.banned_until) > new Date())
    ) {
      await revokeGrant(hashCredential(token), input.client_id, options);
      return oauthResponse({ error: "invalid_grant" }, 400);
    }
    return oauthResponse({
      scope: grant.access_level,
      access_token: token,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: Math.max(
        0,
        Math.floor((Date.parse(grant.access_expires_at) - Date.now()) / 1000),
      ),
    });
  } catch {
    return oauthResponse({ error: "invalid_request" }, 400);
  }
}
