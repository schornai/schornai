import { watch } from "node:fs/promises";
import { join } from "node:path";

/** Watch the actual Ollama model directory, also when it is mounted read-only. */
export async function watchOllamaModels({
  directory,
  changes,
  abortSignal,
}: {
  directory: string;
  changes: EventTarget;
  abortSignal: AbortSignal;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Start watching before requesting the initial snapshot to avoid missing changes.
  const events = watch(join(directory, "manifests"), {
    recursive: true,
    signal: abortSignal,
  });
  const notify = () => changes.dispatchEvent(new Event("change"));
  try {
    const first = events.next();
    notify();
    let event = await first;
    while (!event.done) {
      clearTimeout(timer);
      timer = setTimeout(notify, 250);
      event = await events.next();
    }
  } finally {
    clearTimeout(timer);
    await events.return?.();
  }
}
