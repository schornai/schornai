/** Resolve the browser-facing origin behind the bundled TLS proxy.
 * The ingress must overwrite X-Forwarded-Host and X-Forwarded-Proto (as
 * apps/proxy/nginx.conf.template does); do not expose an untrusted proxy chain.
 * X-Forwarded-Port is intentionally ignored: Docker's internal 443 may be
 * published as 3000, and the external port is already part of forwarded host.
 */
export function mcpRequestOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host");
  const protocol = request.headers.get("x-forwarded-proto");
  if (host === null && protocol === null) return new URL(request.url).origin;
  if (
    !host ||
    (protocol !== "https" && protocol !== "http") ||
    /[\s,/@\\?#]/.test(host)
  ) {
    throw new Error("Invalid forwarded origin");
  }
  const url = new URL(`${protocol}://${host}`);
  if (url.username || url.password || url.pathname !== "/") {
    throw new Error("Invalid forwarded origin");
  }
  return url.origin;
}
