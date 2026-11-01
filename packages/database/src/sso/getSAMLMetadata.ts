import type { ServiceRoleConfig } from "./_types.ts";
import { createSSOAuthHeaders } from "./_utils.ts";

export async function getSAMLMetadata({
  supabaseServiceRoleConfig,
}: {
  supabaseServiceRoleConfig: ServiceRoleConfig;
}) {
  const url = new URL(supabaseServiceRoleConfig.supabaseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "").replace(/\/auth\/v1$/, "")}/auth/v1/sso/saml/metadata`;
  url.search = "?download=true";
  url.hash = "";
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        ...createSSOAuthHeaders(supabaseServiceRoleConfig),
        Accept: "application/samlmetadata+xml, application/xml, text/xml",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("SAML_METADATA_UNAVAILABLE");
  }
  if (
    !response.ok &&
    response.headers.get("x-sb-error-code") === "saml_provider_disabled"
  )
    return { configured: false as const };
  if (
    !response.ok ||
    !/\bxml\b/i.test(response.headers.get("content-type") ?? "")
  )
    throw new Error("SAML_METADATA_UNAVAILABLE");
  const xml = await response.text();
  if (!xml.trim() || xml.length > 1024 * 1024)
    throw new Error("SAML_METADATA_INVALID");
  return { configured: true as const, xml };
}
