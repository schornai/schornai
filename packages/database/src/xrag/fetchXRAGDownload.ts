import { fetch } from "undici";

/** Large archive payloads must bypass Next.js's fetch instrumentation. Its
 * development cache can clone even a no-store response into an ArrayBuffer. */
export async function fetchXRAGDownload(
  url: string,
  init: Pick<RequestInit, "signal" | "headers">,
) {
  const response = await fetch(url, {
    signal: init.signal,
    headers: {
      "accept-encoding": "identity",
      ...Object.fromEntries(new Headers(init.headers)),
    },
    redirect: "error",
  });
  return new Response(response.body as ReadableStream<Uint8Array> | null, {
    status: response.status,
    headers: Object.fromEntries(response.headers),
  });
}
