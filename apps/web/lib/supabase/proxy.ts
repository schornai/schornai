import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SUPABASE_COOKIE_NAME } from "@/lib/supabase/_shared";
import { createServerClient } from "@supabase/ssr";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export async function updateSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
) {
  const SUPABASE_URL = getEnvSafe("SUPABASE_URL");
  const SUPABASE_PUBLIC_ANON_KEY = getEnvSafe("SUPABASE_PUBLIC_ANON_KEY");

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_ANON_KEY, {
    cookieOptions: {
      name: SUPABASE_COOKIE_NAME,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/signin") &&
    !request.nextUrl.pathname.startsWith("/feedback")
  ) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/signin";
    if (request.nextUrl.pathname !== "/" || request.nextUrl.search !== "") {
      signInUrl.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search + request.nextUrl.hash)}`;
    }
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}
