import { SUPABASE_COOKIE_NAME } from "@/lib/supabase/_shared";
import type { SupabaseDatabase } from "@schornio/aibox-package-database/_shared/_types";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import { io } from "next/cache";

export const createSupabaseServerClient = cache(async () => {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_PUBLIC_ANON_KEY = getEnvSafe("SUPABASE_PUBLIC_ANON_KEY");

  const cookieStore = await cookies();
  // Cookie reads can finish during partial prefetching; Auth's session expiry
  // checks read the current time and must wait for the dynamic render stage.
  await io();

  // Create a server's supabase client with newly configured cookie,
  // which could be used to maintain user's session
  return createServerClient<SupabaseDatabase>(
    SUPABASE_URL,
    SUPABASE_PUBLIC_ANON_KEY,
    {
      cookieOptions: {
        name: SUPABASE_COOKIE_NAME,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
});
