import { fetch as upload } from "undici";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";
import {
  transferPathSchema,
  XRAG_UPLOAD_CHUNK_BYTES,
} from "@schornio/aibox-package-database/xrag/transferSchema";

// The signed token grants a single immutable upload. Storage verifies it.
export async function PUT(
  request: Request,
  context: RouteContext<"/api/xrag/upload/[...path]">,
) {
  const { path } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  if (
    !token ||
    path.length !== 3 ||
    !transferPathSchema.safeParse(path.join("/")).success
  )
    return new Response(null, { status: 400 });
  const url = new URL(
    getEnvSafe("SUPABASE_URL").replace(/\/+$/, "") +
      "/storage/v1/object/upload/sign/xrag-transfers/" +
      path.map(encodeURIComponent).join("/"),
  );
  url.searchParams.set("token", token);
  const headers = new Headers({
    apikey: getEnvSafe("SUPABASE_PUBLIC_ANON_KEY"),
    "content-type": request.headers.get("content-type") ?? "application/x-tar",
  });
  const length = request.headers.get("content-length");
  if (length && Number(length) > XRAG_UPLOAD_CHUNK_BYTES)
    return new Response(null, { status: 413 });
  if (length) headers.set("content-length", length);
  let received = 0;
  const body = request.body?.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > XRAG_UPLOAD_CHUNK_BYTES)
          throw new Error("XRAG_UPLOAD_TOO_LARGE");
        controller.enqueue(chunk);
      },
    }),
  );
  try {
    const response = await upload(url, {
      method: "PUT",
      body: body as import("node:stream/web").ReadableStream<Uint8Array> | null,
      headers: Object.fromEntries(headers),
      signal: request.signal,
      duplex: "half",
      redirect: "error",
      cache: "no-store",
    });
    await response.body?.cancel();
    return new Response(null, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (received > XRAG_UPLOAD_CHUNK_BYTES)
      return new Response(null, { status: 413 });
    throw error;
  }
}
