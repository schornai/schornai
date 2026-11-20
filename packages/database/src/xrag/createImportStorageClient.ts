import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../_shared/_supabase.ts";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

/** Server-only, after exact import authorization. Storage finalizes uploads in a
 * separate transaction; the signed attempt token fences late requests from an
 * abandoned importer even after the recovery worker has taken over. */
export function createImportStorageClient(id: string, token: string) {
  const secret = new TextEncoder().encode(getEnvSafe("SUPABASE_JWT_SECRET"));
  return createClient<Database>(
    getEnvSafe("SUPABASE_URL"),
    getEnvSafe("SUPABASE_SERVICE_ROLE_KEY"),
    {
      accessToken: () =>
        new SignJWT({
          role: "service_role",
          xrag_import_id: id,
          xrag_import_token: token,
        })
          .setProtectedHeader({ alg: "HS256" })
          .setExpirationTime("10m")
          .setSubject(token)
          .sign(secret),
    },
  );
}
