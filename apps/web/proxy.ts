import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createProxy } from "next-i18next/proxy";
import i18nConfig from "./i18n.config";
import { updateSession } from "./lib/supabase/proxy";

const i18nProxy = createProxy(i18nConfig);

export async function proxy(request: NextRequest) {
  // START: To ensure backwards compatibility until end of 2026
  const url = new URL(request.url);
  if (
    url.pathname === "/de" ||
    url.pathname.startsWith("/de/") ||
    url.pathname === "/en" ||
    url.pathname.startsWith("/en/")
  ) {
    const compatUrl = new URL(url);
    compatUrl.pathname = url.pathname.substring(3);
    return NextResponse.redirect(compatUrl);
  }
  // END: To ensure backwards compatibility until end of 2026

  const i18nResponse = i18nProxy(
    request as unknown as Parameters<typeof i18nProxy>[0],
  );

  return await updateSession(request, i18nResponse as unknown as NextResponse);
}

export const config = {
  matcher: [
    "/((?!api|mcp(?:/|$)|static|.*\\..*|_next|favicon.ico|robots.txt).*)",
  ],
};
