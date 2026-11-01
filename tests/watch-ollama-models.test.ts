import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { watchOllamaModels } from "../apps/realtime/src/_utils/watchOllamaModels.ts";

it("pushes real manifest changes and stops watching on shutdown", async () => {
  const directory = await mkdtemp(join(tmpdir(), "aibox-models-"));
  await mkdir(join(directory, "manifests"));
  const controller = new AbortController();
  const changes = new EventTarget();
  let count = 0;
  changes.addEventListener("change", () => count++);
  const watching = watchOllamaModels({
    directory,
    changes,
    abortSignal: controller.signal,
  }).catch((error) => {
    if (!controller.signal.aborted) throw error;
  });
  try {
    await expect.poll(() => count).toBe(1);
    await writeFile(join(directory, "manifests", "model"), "{}");
    await expect.poll(() => count).toBeGreaterThan(1);
  } finally {
    controller.abort();
    await watching;
    await rm(directory, { recursive: true, force: true });
  }
});
