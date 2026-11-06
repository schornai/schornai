import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  checkIntegrity,
  getDirectoryIntegrity,
  getFileIntegrity,
  getDockerImageIntegrity,
  getDockerImageIntegrityFromPullOutput,
  type Integrity,
} from "../packages/xrag/update/scripts/modules/integrity.ts";
import { run } from "../packages/xrag/update/scripts/modules/run.mts";

vi.mock("../packages/xrag/update/scripts/modules/run.mts", () => ({
  run: vi.fn(),
}));
const roots: string[] = [];
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.mocked(run).mockReset();
});
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

it("hashes nested file content and rejects directory/file mismatches", async () => {
  const root = await mkdtemp(join(tmpdir(), "xrag-integrity-"));
  roots.push(root);
  await mkdir(join(root, "bundle"));
  await writeFile(join(root, "bundle/app.js"), "application");
  const file = {
    type: "file",
    name: "app.js",
    hash: createHash("sha256").update("application").digest("hex"),
  };
  expect(await getFileIntegrity(join(root, "bundle/app.js"))).toEqual(file);
  expect(await getDirectoryIntegrity(join(root, "bundle"))).toEqual({
    type: "directory",
    name: "bundle",
    content: [file],
  });
  await expect(getFileIntegrity(join(root, "bundle"))).rejects.toThrow(
    "because it is a directory",
  );
  await expect(
    getDirectoryIntegrity(join(root, "bundle/app.js")),
  ).rejects.toThrow("because it is a file");
  await expect(getFileIntegrity(join(root, "missing"))).rejects.toMatchObject({
    code: "ENOENT",
  });
});

it.each([
  {
    RepoDigests: [`image@sha256:${"a".repeat(64)}`],
    Id: `sha256:${"b".repeat(64)}`,
  },
  { RepoDigests: [], Id: `sha256:${"a".repeat(64)}` },
  { Id: `sha256:${"a".repeat(64)}` },
])("uses the published digest or a local image ID", async (image) => {
  vi.mocked(run).mockResolvedValue({
    stdout: JSON.stringify([image]),
    stderr: "",
  });
  expect(await getDockerImageIntegrity("example/app", "release")).toEqual({
    type: "docker-image",
    name: "example/app",
    tag: "release",
    digest: "a".repeat(64),
  });
  expect(run).toHaveBeenCalledWith("docker", [
    "image",
    "inspect",
    "example/app:release",
  ]);
});

it.each([
  "[]",
  "[{}]",
  '[{"Id":"invalid"}]',
  '[{"RepoDigests":["sha256:abc"]}]',
])("rejects missing or malformed image digests: %s", async (stdout) => {
  vi.mocked(run).mockResolvedValue({ stdout, stderr: "" });
  await expect(getDockerImageIntegrity("app", "latest")).rejects.toThrow(
    "Could not extract digest",
  );
});

it("validates pull digests and propagates inspection failures", async () => {
  expect(
    getDockerImageIntegrityFromPullOutput(
      "app",
      "latest",
      `Digest: sha256:${"c".repeat(64)}`,
    ),
  ).toMatchObject({ digest: "c".repeat(64), tag: "latest" });
  expect(() =>
    getDockerImageIntegrityFromPullOutput("app", "latest", "no digest"),
  ).toThrow("Could not extract digest");
  vi.mocked(run).mockRejectedValue(new Error("Docker unavailable"));
  await expect(getDockerImageIntegrity("app", "latest")).rejects.toThrow(
    "Docker unavailable",
  );
});

const file: Integrity = { type: "file", name: "binary", hash: "expected" };
const directory: Integrity = {
  type: "directory",
  name: "bundle",
  content: [file],
};
const docker: Integrity = {
  type: "docker-image",
  name: "image",
  tag: "v1",
  digest: "expected",
};
const binary: Integrity = {
  type: "bin-version",
  name: "node",
  version: "24",
  fileIntegrity: file,
};
it.each([file, directory, docker, binary])(
  "accepts matching $type integrity",
  (expected) => {
    expect(() =>
      checkIntegrity(expected, structuredClone(expected)),
    ).not.toThrow();
  },
);
it.each([
  [file, directory, "Expected integrity of type"],
  [file, { ...file, name: "other" }, "Expected integrity with name"],
  [file, { ...file, hash: "modified" }, "Expected file integrity with hash"],
  [directory, { ...directory, content: [] }, "content items"],
  [
    directory,
    { ...directory, content: [{ ...file, name: "unrelated" }] },
    "was not found",
  ],
  [
    docker,
    { ...docker, digest: "modified" },
    "Expected docker image integrity",
  ],
  [binary, { ...binary, version: "22" }, "Expected bin version integrity"],
  [
    binary,
    { ...binary, fileIntegrity: { ...file, hash: "modified" } },
    "Expected file integrity with hash",
  ],
] as const)(
  "rejects altered or missing integrity data",
  (expected, actual, message) => {
    expect(() =>
      checkIntegrity(expected as Integrity, actual as Integrity),
    ).toThrow(message);
  },
);
