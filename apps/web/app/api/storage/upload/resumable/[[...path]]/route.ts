import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

const SUPABASE_URL = getEnvSafe("SUPABASE_URL").replace(/\/+$/, "");
const SUPABASE_PUBLIC_ANON_KEY = getEnvSafe("SUPABASE_PUBLIC_ANON_KEY");
const PUBLIC_PREFIX = "/api/storage/upload/resumable";
const UPSTREAM_PREFIX = "/storage/v1/upload/resumable";

function copyRequestHeaders(request: Request) {
  const headers = new Headers({ apikey: SUPABASE_PUBLIC_ANON_KEY });
  // Never forward application cookies, proxy routing headers or arbitrary keys.
  for (const name of [
    "authorization",
    "content-type",
    "tus-resumable",
    "upload-length",
    "upload-defer-length",
    "upload-offset",
    "upload-metadata",
    "upload-checksum",
    "x-upsert",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function rewriteLocation(location: string | null) {
  if (!location) return undefined;
  const upstream = new URL(location, SUPABASE_URL);
  const prefix = [UPSTREAM_PREFIX, "/upload/resumable"].find((value) =>
    upstream.pathname.startsWith(`${value}/`),
  );
  if (!prefix) return undefined;
  return PUBLIC_PREFIX + upstream.pathname.slice(prefix.length);
}

async function proxyTus(
  request: Request,
  context: RouteContext<"/api/storage/upload/resumable/[[...path]]">,
  method: "POST" | "HEAD" | "PATCH" | "DELETE",
) {
  if (!/^Bearer [^\s]+$/i.test(request.headers.get("authorization") ?? "")) {
    return new Response(null, { status: 401 });
  }
  const { path } = await context.params;
  // URL parsers normalize dot segments, even after encodeURIComponent().
  if (
    path?.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        /[/\\\u0000-\u001f\u007f]/.test(segment),
    )
  ) {
    return new Response(null, { status: 400 });
  }
  const suffix = path?.length
    ? `/${path.map(encodeURIComponent).join("/")}`
    : "";
  let upstream: Response;
  try {
    upstream = await fetch(`${SUPABASE_URL}${UPSTREAM_PREFIX}${suffix}`, {
      body: method === "HEAD" ? undefined : request.body,
      headers: copyRequestHeaders(request),
      method,
      redirect: "error",
      cache: "no-store",
      signal: request.signal,
      ...(method === "HEAD" ? {} : { duplex: "half" }),
    });
  } catch (error) {
    if (request.signal.aborted) throw error;
    return new Response(null, { status: 502 });
  }
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  for (const name of [
    "content-type",
    "tus-resumable",
    "tus-version",
    "tus-extension",
    "tus-max-size",
    "upload-offset",
    "upload-length",
    "upload-defer-length",
    "upload-expires",
    "retry-after",
  ]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  try {
    const location = rewriteLocation(upstream.headers.get("location"));
    if (location) responseHeaders.set("location", location);
  } catch {
    await upstream.body?.cancel();
    return new Response(null, { status: 502 });
  }
  return new Response(method === "HEAD" ? null : upstream.body, {
    headers: responseHeaders,
    status: upstream.status,
    statusText: upstream.statusText,
  });
}

export function POST(
  request: Request,
  context: RouteContext<"/api/storage/upload/resumable/[[...path]]">,
) {
  return proxyTus(request, context, "POST");
}
export function HEAD(
  request: Request,
  context: RouteContext<"/api/storage/upload/resumable/[[...path]]">,
) {
  return proxyTus(request, context, "HEAD");
}
export function PATCH(
  request: Request,
  context: RouteContext<"/api/storage/upload/resumable/[[...path]]">,
) {
  return proxyTus(request, context, "PATCH");
}
export function DELETE(
  request: Request,
  context: RouteContext<"/api/storage/upload/resumable/[[...path]]">,
) {
  return proxyTus(request, context, "DELETE");
}
