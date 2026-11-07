export function oauthResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
export function oauthOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** OAuth payloads are small. Count actual streamed bytes: Content-Length can
 * be absent (chunked requests) or forged and is only an early-rejection hint. */
export async function readOAuthBody(request: Request): Promise<string> {
  const limit = 32 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("OAUTH_BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("OAUTH_BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(
      Buffer.concat(chunks),
    );
  } finally {
    reader.releaseLock();
  }
}
