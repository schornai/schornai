import { join } from "node:path";
import { lstat, readdir, rename, rm } from "node:fs/promises";

async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return false;
  }
}

/** Called with the machine's exclusive install ownership, before consumers start.
 * The old directory is the recovery record until the prepared one is activated.
 */
export async function recoverArtifactDirectory(target: string) {
  const previous = `${target}.xrag-previous`;
  if (await exists(previous)) {
    if (!(await exists(target))) await rename(previous, target);
    else await rm(previous, { recursive: true, force: true });
  }
  await rm(`${target}.xrag-new`, { recursive: true, force: true });
}

/** Consume a fully validated directory on the destination filesystem.
 * A crash between renames is recovered on the next attempt/startup. No payload
 * copy and no removal of the last usable version before its replacement exists.
 */
export async function activateArtifactDirectory(
  source: string,
  target: string,
) {
  await recoverArtifactDirectory(target);
  const staged = `${target}.xrag-new`;
  const previous = `${target}.xrag-previous`;
  await rename(source, staged);
  try {
    if (await exists(target)) await rename(target, previous);
    await rename(staged, target);
  } catch (error) {
    await recoverArtifactDirectory(target);
    throw error;
  }
  await rm(previous, { recursive: true, force: true });
}

/** Repair interrupted swaps before model consumers start, even without sharing. */
export async function recoverArtifactInstallations(root: string) {
  async function entries(directory: string) {
    try {
      if (!(await lstat(directory)).isDirectory()) return [];
      return await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  const models = join(root, "mlx/whisper/models");
  const parents = [models, join(root, "apps"), join(root, "bin")];
  for (const entry of await entries(join(root, "assets"))) {
    if (entry.isDirectory()) parents.push(join(root, "assets", entry.name));
  }
  for (const parent of parents) {
    const targets = new Set<string>();
    for (const entry of await entries(parent)) {
      const match = /^(.*)\.xrag-(?:new|previous)$/.exec(entry.name);
      if (match?.[1]) targets.add(join(parent, match[1]));
      // Previous releases staged MLX copies here with random names.
      if (parent === models && entry.name.startsWith(".install-"))
        await rm(join(parent, entry.name), { recursive: true, force: true });
    }
    for (const target of targets) await recoverArtifactDirectory(target);
  }
}
