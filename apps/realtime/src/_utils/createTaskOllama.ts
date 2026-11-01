import { createOllama } from "ai-sdk-ollama";
import { getEnvSafe } from "@schornio/aibox-package-utils/getEnvSafe";

export function createTaskOllama(abortSignal: AbortSignal) {
  return createOllama({
    baseURL: getEnvSafe("OLLAMA_URL"),
    // ollama-js 0.6.x ignores the SDK's per-request signal argument.
    // Bind cancellation to fetch so it also stops an already streaming body.
    fetch: (input, init) => {
      abortSignal.throwIfAborted();
      const requestSignal =
        init?.signal ?? (input instanceof Request ? input.signal : undefined);
      return fetch(input, {
        ...init,
        signal: requestSignal
          ? AbortSignal.any([abortSignal, requestSignal])
          : abortSignal,
      });
    },
  });
}
