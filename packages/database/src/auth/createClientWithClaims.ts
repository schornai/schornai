import type { Database } from "../_shared/_supabase.ts";
import { SignJWT } from "jose";
import type { SupabaseClient } from "../_shared/_types.ts";
import type { UserClaims } from "./_types.ts";
import { createClient as createClientCore } from "@supabase/supabase-js";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export async function createClientWithClaims(
  userId: string,
  claims: UserClaims,
  config = {
    environmentKeys: {
      supabaseJWTSecret: "SUPABASE_JWT_SECRET",
      supabaseKey: "SUPABASE_ANON_KEY",
      supabaseUrl: "SUPABASE_URL",
    },
  },
  refreshToken = false,
): Promise<SupabaseClient> {
  const supabaseJWTSecret = getEnvSafe(
    config.environmentKeys.supabaseJWTSecret,
  );
  const supabaseKey = getEnvSafe(config.environmentKeys.supabaseKey);
  const supabaseUrl = getEnvSafe(config.environmentKeys.supabaseUrl);

  const secret = new TextEncoder().encode(supabaseJWTSecret);
  const sign = () =>
    new SignJWT({
      organization_roles: claims,
      role: "authenticated",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .setSubject(userId)
      .sign(secret);

  const token = refreshToken ? undefined : await sign();
  return createClientCore<Database>(supabaseUrl, supabaseKey, {
    ...(refreshToken
      ? { accessToken: sign }
      : { global: { headers: { Authorization: `Bearer ${token}` } } }),
  });
}

// https://www.npmjs.com/package/jsonwebtoken
