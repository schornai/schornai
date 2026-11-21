import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import {
  createResourceArchive,
  streamResourceArchive,
} from "../packages/xrag/src/resourceArchive.ts";
import {
  extractArchive,
  inspectArchive,
} from "../packages/xrag/src/archive.ts";
import { serializeResource } from "../packages/database/src/xrag/resource.ts";
import { requireImportAccess } from "../packages/database/src/xrag/requireImportAccess.ts";

const id = "11111111-1111-4111-8111-111111111111";
const repository = serializeResource(
  "documentRepository",
  {
    name: "Knowledge",
    description: "Documents",
    type: "database-v2",
  },
  id,
  [],
);
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "resource-archive-test-"));
  roots.push(root);
  return { root, output: join(root, "repository.xrag.tar") };
}
async function* files(path = "Ordner/Änderungen.txt") {
  yield {
    path,
    content: (async function* () {
      yield Buffer.from("file ");
      yield Buffer.from("content");
    })(),
  };
}

it("preserves repository file names and bytes in a portable archive", async () => {
  const { root, output } = await fixture();
  const written = await createResourceArchive(repository, files(), output);
  const inspected = await inspectArchive(createReadStream(output));
  expect(inspected.xrag).toEqual(repository);
  expect(inspected.id).toBe(written.id);
  const destination = join(root, "unpacked");
  await mkdir(destination);
  await extractArchive(output, destination, written.id);
  expect(
    await readFile(join(destination, "files/Ordner/Änderungen.txt"), "utf8"),
  ).toBe("file content");
});

it.each(["../escape", "/absolute", "C:\\escape", "."])(
  "rejects unsafe file path %s",
  async (path) => {
    const { output } = await fixture();
    await expect(
      createResourceArchive(repository, files(path), output),
    ).rejects.toThrow();
    await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
  },
);

it("rejects files on non-repository resources and enforces streaming limits", async () => {
  const { output } = await fixture();
  const transcriber = serializeResource(
    "transcriber",
    { name: "Transcriber", version: "transcriber-v2" },
    id,
    [],
  );
  await expect(
    createResourceArchive(transcriber, files(), output),
  ).rejects.toThrow("INVALID_RESOURCE_PAYLOAD");
  await expect(
    createResourceArchive(repository, files(), output, {
      limits: { maxExtractedBytes: 4, maxEntries: 100 },
    }),
  ).rejects.toThrow("EXTRACTED_LIMIT");
});

it("authorizes the selected workspace and rejects the whole mixed import", () => {
  const claims = [{ organization_id: id, role: "workspace-admin" as const }];
  expect(
    requireImportAccess([repository], { workspaceId: id }, claims),
  ).toHaveLength(1);
  expect(() =>
    requireImportAccess([repository], { workspaceId: "other" }, claims),
  ).toThrow("NOT_AUTHORIZED");
  expect(() =>
    requireImportAccess([repository], { newWorkspace: true }, claims),
  ).toThrow("NOT_AUTHORIZED");
  const model = {
    xrag_version: 1,
    xrag_type: "mlxWhisperModel",
    meta: { name: "Model", identifier: "model" },
  };
  expect(() =>
    requireImportAccess([repository, model], { workspaceId: id }, claims),
  ).toThrow("NOT_AUTHORIZED");
  expect(
    requireImportAccess([repository, model], { newWorkspace: true }, "admin"),
  ).toHaveLength(2);
});

it("rejects incomplete and unexpanded imports even for global admins", () => {
  expect(() => requireImportAccess([], { workspaceId: id }, "admin")).toThrow(
    "ENTRY_LIMIT",
  );
  expect(() =>
    requireImportAccess(
      [
        {
          xrag_version: 2,
          xrag_type: "collection",
          entries: [{ sha256: "a".repeat(64), size: 1024 }],
        },
      ],
      { workspaceId: id },
      "admin",
    ),
  ).toThrow("UNEXPANDED_COLLECTION");
  expect(() =>
    requireImportAccess([repository], { workspaceId: "" }, "admin"),
  ).toThrow("NOT_AUTHORIZED");
});

it("rejects oversized resource metadata before the first archive header", async () => {
  const large = { ...repository, data: { notes: "x".repeat(256_000) } };
  await expect(streamResourceArchive(large, []).next()).rejects.toThrow(
    "XRAG_INVALID_METADATA",
  );
});

it("stops an unsized source while spooling when it exceeds the remaining byte budget", async () => {
  const file = {
    path: "notes",
    content: (async function* () {
      yield Buffer.alloc(2048);
    })(),
  };
  const { output } = await fixture();
  await expect(
    createResourceArchive(repository, [file], output, {
      limits: { maxExtractedBytes: 1024, maxEntries: 100 },
    }),
  ).rejects.toThrow("XRAG_EXTRACTED_LIMIT");
  await expect(readFile(output)).rejects.toMatchObject({ code: "ENOENT" });
});

it("counts the file inventory towards the entry limit", async () => {
  await expect(
    Array.fromAsync(
      streamResourceArchive(repository, files(), {
        limits: { maxExtractedBytes: 100_000, maxEntries: 2 },
      }),
    ),
  ).rejects.toThrow("XRAG_ENTRY_LIMIT");
});

it("rejects two input file paths that normalize to the same archived name", async () => {
  async function* duplicateFiles() {
    yield* files("docs/file.txt");
    yield* files("docs/./file.txt");
  }
  await expect(
    Array.fromAsync(streamResourceArchive(repository, duplicateFiles())),
  ).rejects.toThrow("XRAG_INVALID_RESOURCE_PAYLOAD");
});
