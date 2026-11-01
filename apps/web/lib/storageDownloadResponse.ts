/** Relay Storage's range response without buffering the complete media file. */
export async function storageDownloadResponse(
  request: Request,
  signedUrl: string,
): Promise<Response> {
  const headers = new Headers({ "Accept-Encoding": "identity" });
  for (const name of ["range", "if-range"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let upstream: Response;
  try {
    upstream = await fetch(signedUrl, {
      headers,
      signal: request.signal,
      cache: "no-store",
      redirect: "error",
    });
  } catch (error) {
    if (request.signal.aborted) throw error;
    return new Response(null, { status: 502 });
  }
  return storageFileResponse(upstream);
}

/** Apply the same origin isolation to streamed files and bounded logo blobs. */
export async function storageFileResponse(
  upstream: Response,
): Promise<Response> {
  if (![200, 206, 416].includes(upstream.status)) {
    await upstream.body?.cancel();
    return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
  }
  const responseHeaders = new Headers({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    // Uploaded HTML/SVG must never acquire the application's origin privileges.
    "Content-Security-Policy": "sandbox; default-src 'none'",
  });
  const contentType = upstream.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (
    !contentType ||
    !/^(?:image\/(?:avif|bmp|gif|jpeg|png|webp)|audio\/[a-z0-9.+-]+|video\/[a-z0-9.+-]+|application\/pdf|text\/plain)$/.test(
      contentType,
    )
  ) {
    responseHeaders.set("Content-Disposition", "attachment");
  }
  for (const name of [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
