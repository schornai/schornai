import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/** Publish a complete download set only after all downloads and version probes pass. */
export async function replaceDirectory(
  target: string,
  prepare: (directory: string) => Promise<void>,
) {
  target = resolve(target);
  await mkdir(dirname(target), { recursive: true });
  const temporary = await mkdtemp(join(dirname(target), ".downloads-"));
  const candidate = join(temporary, "new");
  const backup = join(temporary, "previous");
  let hasBackup = false;
  let published = false;
  try {
    await mkdir(candidate);
    await prepare(candidate);
    try {
      await rename(target, backup);
      hasBackup = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await rename(candidate, target);
    published = true;
  } finally {
    if (hasBackup && !published) await rename(backup, target);
    await rm(temporary, { recursive: true, force: true });
  }
}
