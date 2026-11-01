import { expect, test, vi } from "vitest";
import { createTaskOllama } from "./createTaskOllama.ts";

test("stopping one generation aborts its HTTP request without stopping another", async () => {
  const signals: AbortSignal[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_input: unknown, init: RequestInit) => {
      const signal = init.signal!;
      signals.push(signal);
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Stopped", "AbortError")),
          { once: true },
        );
      });
    }),
  );
  const first = new AbortController();
  const second = new AbortController();
  const firstResult = createTaskOllama(first.signal)("test").doGenerate({
    prompt: [],
  });
  const secondResult = createTaskOllama(second.signal)("test").doGenerate({
    prompt: [],
  });
  const firstRejected = expect(firstResult).rejects.toThrow();
  const secondRejected = expect(secondResult).rejects.toThrow();
  await vi.waitFor(() => expect(signals).toHaveLength(2));

  first.abort();
  await firstRejected;
  expect(signals[0]?.aborted).toBe(true);
  expect(signals[1]?.aborted).toBe(false);

  second.abort();
  await secondRejected;
});

test("stopping after response headers aborts the active Ollama stream", async () => {
  const task = new AbortController();
  let requestSignal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_input: unknown, init: RequestInit) => {
      requestSignal = init.signal!;
      return Promise.resolve(
        new Response(
          new ReadableStream({
            start(controller) {
              requestSignal!.addEventListener(
                "abort",
                () => controller.error(requestSignal!.reason),
                { once: true },
              );
            },
          }),
        ),
      );
    }),
  );
  const { stream } = await createTaskOllama(task.signal)("test").doStream({
    prompt: [],
  });
  const consume = async () => {
    const reader = stream.getReader();
    try {
      while (!(await reader.read()).done) {
        // Drain the SDK stream, as the model worker does.
      }
    } finally {
      reader.releaseLock();
    }
  };
  const rejected = expect(consume()).rejects.toThrow();
  task.abort();
  await rejected;
  expect(requestSignal?.aborted).toBe(true);
});
