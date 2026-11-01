import { SUPABASE_COOKIE_NAME } from "@/lib/supabase/_shared";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { useSyncExternalStore } from "react";
import { parseCookieHeader, stringFromBase64URL } from "@supabase/ssr";

function getToken(cookieName: string) {
  const cookies = new Map(
    parseCookieHeader(document.cookie).map(({ name, value }) => [name, value]),
  );
  // Supabase splits large sessions (for example SSO claims) into .0, .1, ...
  // cookies. Follow its storage format and prefer the unchunked value if set.
  let cookie = cookies.get(cookieName) ?? "";
  if (!cookie) {
    for (let index = 0; cookies.get(`${cookieName}.${index}`); index++) {
      cookie += cookies.get(`${cookieName}.${index}`);
    }
  }
  if (!cookie) return undefined;
  const cookieContentString = cookie.startsWith("base64-")
    ? stringFromBase64URL(cookie.slice(7))
    : cookie;
  const cookieContent = JSON.parse(cookieContentString) as unknown;

  if (
    cookieContent &&
    typeof cookieContent === "object" &&
    "access_token" in cookieContent &&
    typeof cookieContent.access_token === "string"
  ) {
    return cookieContent.access_token;
  }

  return undefined;
}

function subscribe(callback: () => void) {
  const listener = () => callback();

  if (typeof cookieStore !== "undefined") {
    cookieStore.addEventListener("change", listener);
    return () => cookieStore.removeEventListener("change", listener);
  }

  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export function useSessionToken() {
  return useSyncExternalStore(
    subscribe,
    () => trySync(() => getToken(SUPABASE_COOKIE_NAME)).data,
    () => null,
  );
}
