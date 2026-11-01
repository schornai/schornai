import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { resolveWebTarget } from "./networkPolicy.ts";

export class WebRequestError extends Error {}

export type WebResponse = {
  status: number;
  location?: string;
  contentType: string;
  body: Uint8Array;
  contentDisposition?: string;
};
export type WebRequest = typeof requestWeb;

export async function requestWeb(
  url: URL,
  {
    signal,
    headers = {},
    maxBytes = 2_000_000,
    allowPrivateNetwork = false,
  }: {
    signal: AbortSignal;
    headers?: Record<string, string>;
    maxBytes?: number;
    allowPrivateNetwork?: boolean;
  },
): Promise<WebResponse> {
  signal.throwIfAborted();
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new WebRequestError(
      "Only HTTP(S) URLs without credentials are supported.",
    );
  }
  const lookup = await resolveWebTarget(
    url.hostname,
    signal,
    allowPrivateNetwork,
  ).catch(() => {
    signal.throwIfAborted();
    throw new WebRequestError(
      "The destination could not be resolved or requires an exact host in the web fetch whitelist for private network access.",
    );
  });
  return new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        signal,
        agent: false,
        lookup,
        // Keep TLS certificate validation even when the dev server disables it.
        rejectUnauthorized: true,
        headers: {
          "User-Agent": "schornai-web-tool/1.0",
          "Accept-Encoding": "identity",
          ...headers,
        },
      },
      (res) => {
        const status = res.statusCode ?? 500;
        const contentType = res.headers["content-type"] ?? "";
        if (status >= 300 && status < 400) {
          res.destroy();
          resolve({
            status,
            location: res.headers.location,
            contentType,
            body: new Uint8Array(),
          });
          return;
        }
        if (Number(res.headers["content-length"]) > maxBytes) {
          res.destroy(
            new WebRequestError(
              `The file exceeds the maximum response size (${maxBytes} bytes).`,
            ),
          );
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes)
            res.destroy(
              new WebRequestError(
                `The file exceeds the maximum response size (${maxBytes} bytes).`,
              ),
            );
          else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status,
            contentType,
            body: Buffer.concat(chunks),
            contentDisposition: res.headers["content-disposition"],
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

export function webToolError(
  error: unknown,
  abortSignal?: AbortSignal,
): { ok: false; error: string } {
  abortSignal?.throwIfAborted();
  return {
    ok: false,
    error:
      error instanceof WebRequestError
        ? error.message
        : "Web request failed or timed out. Please try again.",
  };
}

export function webRequestSignal(
  abortSignal?: AbortSignal,
  timeoutMs = 20_000,
) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return abortSignal ? AbortSignal.any([abortSignal, timeout]) : timeout;
}
