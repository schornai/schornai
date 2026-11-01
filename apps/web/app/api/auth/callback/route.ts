import { safeRedirectPath } from "@/lib/safeRedirectPath";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  const SITE_URL = getEnvSafe("SITE_URL");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, SITE_URL));
    }
  }

  return NextResponse.redirect(new URL("/signin?error", SITE_URL));
}
