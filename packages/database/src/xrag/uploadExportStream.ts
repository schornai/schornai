import { Upload } from "tus-js-client";
import type { Readable } from "node:stream";

/** Server-only Node HTTP transport: bypasses Next's fetch cache completely.
 * TUS retains at most a chunk for retry; never converts the archive to a Blob.
 * A process restart rebuilds under a fresh attempt path, never resumes changed bytes. */
export async function uploadExportStream(
  stream: Readable,
  size: number,
  path: string,
  options: {
    endpoint: string;
    token: string;
    signal: AbortSignal;
    bucketName?: "xrag-exports" | "xrag-transfers";
    onProgress?: (bytes: number) => void;
  },
) {
  options.signal.throwIfAborted();
  const endpoint = new URL(options.endpoint);
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let idle: ReturnType<typeof setTimeout>;
    const touch = () => {
      clearTimeout(idle);
      idle = setTimeout(() => failed(new Error("XRAG_UPLOAD_IDLE")), 120_000);
    };
    const done = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(idle);
      options.signal.removeEventListener("abort", abort);
      stream.off("error", failed);
      if (error) reject(error);
      else resolve();
    };
    const upload = new Upload(stream, {
      endpoint: options.endpoint,
      uploadSize: size,
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 1000, 3000, 5000, 10000, 30000],
      headers: {
        apikey: options.token,
        // New Supabase secret keys are opaque; only legacy keys are JWTs.
        ...(options.token.startsWith("sb_secret_")
          ? {}
          : { Authorization: `Bearer ${options.token}` }),
      },
      metadata: {
        bucketName: options.bucketName ?? "xrag-exports",
        objectName: path,
        contentType: "application/x-tar",
        cacheControl: "3600",
      },
      storeFingerprintForResuming: false,
      onProgress: touch,
      onBeforeRequest: (request) => {
        if (new URL(request.getURL()).origin !== endpoint.origin)
          throw new Error("XRAG_UPLOAD_ORIGIN");
        touch();
      },
      onUploadUrlAvailable: () => {
        // Self-hosted Storage can advertise its internal /upload/resumable URL.
        // Keep every request on the configured Storage endpoint, like the UI proxy.
        const location = new URL(upload.url!, endpoint);
        const prefix = [
          endpoint.pathname.replace(/\/$/, ""),
          "/upload/resumable",
        ].find((p) => location.pathname.startsWith(`${p}/`));
        if (!prefix) throw new Error("XRAG_UPLOAD_LOCATION");
        upload.url = new URL(
          endpoint.pathname.replace(/\/$/, "") +
            location.pathname.slice(prefix.length),
          endpoint.origin,
        ).toString();
      },
      onAfterResponse: touch,
      onChunkComplete: (_chunk, bytes) => options.onProgress?.(bytes),
      onError: () => failed(new Error("XRAG_UPLOAD_FAILED")),
      onSuccess: () => done(),
    });
    const failed = (error: unknown) => {
      // Termination is best-effort; Storage also expires abandoned TUS sessions.
      void upload.abort(true).catch(() => {});
      done(error);
    };
    const abort = () => failed(options.signal.reason);
    options.signal.addEventListener("abort", abort, { once: true });
    stream.once("error", failed);
    touch();
    upload.start();
  });
}
