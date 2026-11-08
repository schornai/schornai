import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  activateArtifactDirectory,
  recoverArtifactDirectory,
} from "../packages/service/src/activateArtifactDirectory.ts";
const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "artifact-activation-"));
  directories.push(root);
  const source = join(root, "source");
  const target = join(root, "target");
  await mkdir(source);
  await mkdir(target);
  await writeFile(join(source, "weights"), "new");
  await writeFile(join(target, "weights"), "old");
  return { root, source, target };
}
it("activates validated weights without copying their inode and removes the old version", async () => {
  const { root, source, target } = await fixture();
  const before = await stat(join(source, "weights"));
  await activateArtifactDirectory(source, target);
  expect((await stat(join(target, "weights"))).ino).toBe(before.ino);
  expect(await readFile(join(target, "weights"), "utf8")).toBe("new");
  expect(await readdir(root)).toEqual(["target"]);
});
it.each(["prepared", "old-renamed", "activated"])(
  "recovers the durable state after a crash at %s",
  async (phase) => {
    const { root, source, target } = await fixture();
    await rename(source, `${target}.xrag-new`);
    if (phase !== "prepared") await rename(target, `${target}.xrag-previous`);
    if (phase === "activated") await rename(`${target}.xrag-new`, target);
    await recoverArtifactDirectory(target);
    expect(await readFile(join(target, "weights"), "utf8")).toBe(
      phase === "activated" ? "new" : "old",
    );
    expect(await readdir(root)).toEqual(["target"]);
    await recoverArtifactDirectory(target);
    expect(await readdir(root)).toEqual(["target"]);
  },
);
it("preserves the existing model when the prepared source is missing", async () => {
  const { target } = await fixture();
  await expect(
    activateArtifactDirectory(`${target}/missing`, target),
  ).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readFile(join(target, "weights"), "utf8")).toBe("old");
});

it("repairs model and file installation swaps on startup without touching unrelated paths", async () => {
  const { root } = await fixture();
  const { recoverArtifactInstallations } =
    await import("../packages/service/src/activateArtifactDirectory.ts");
  const model = join(root, "mlx/whisper/models/example");
  const asset = join(root, "assets/dictionary", "a".repeat(64));
  for (const target of [model, asset]) {
    await mkdir(`${target}.xrag-previous`, { recursive: true });
    await writeFile(join(`${target}.xrag-previous`, "data"), "usable");
    await mkdir(`${target}.xrag-new`);
  }
  await recoverArtifactInstallations(root);
  for (const target of [model, asset])
    expect(await readFile(join(target, "data"), "utf8")).toBe("usable");
  expect(await readFile(join(root, "target/weights"), "utf8")).toBe("old");
});
