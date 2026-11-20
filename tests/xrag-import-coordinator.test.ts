import { inspectXRAGTransfer } from "../packages/database/src/xrag/inspectXRAGTransfer.ts";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { c } from "tar";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { createResourceArchive } from "../packages/xrag/src/resourceArchive.ts";
import { createCollection } from "../packages/xrag/src/collection.ts";
import { inspectArchive } from "../packages/xrag/src/archive.ts";
import {
  nativeResourceId,
  importedResourceId,
} from "../packages/xrag/src/identity.ts";
import { serializeResource } from "../packages/database/src/xrag/resource.ts";
import { previewXRAGImport } from "../packages/database/src/xrag/previewXRAGImport.ts";
import { importXRAGTransfer } from "../packages/database/src/xrag/importXRAGTransfer.ts";
import { importBackend } from "./helpers/xragImport.ts";
import { recoverXRAGImport } from "../packages/database/src/xrag/recoverXRAGImport.ts";
const operations = vi.hoisted(() => ({ client: undefined as any }));
vi.mock("../packages/database/src/xrag/createImportStorageClient.ts", () => ({
  createImportStorageClient: () => operations.client,
}));
const roots: string[] = [];
const userId = "11111111-1111-4111-8111-111111111111";
const path = `${userId}/22222222-2222-4222-8222-222222222222/archive.tar`;
const repoId = nativeResourceId("documentRepository", "source-repo");
const transcriberId = nativeResourceId("transcriber", "source-transcriber");
const revision = "a".repeat(32);
beforeEach(() => vi.clearAllMocks());
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture({
  single = false,
  distribution = false,
  onlyDistribution = false,
  existing = false,
  claims = "admin" as any,
} = {}) {
  const root = await mkdtemp(join(tmpdir(), "xrag-import-coordinator-test-"));
  roots.push(root);
  const repo = serializeResource(
    "documentRepository",
    {
      name: "Files",
      color: { type: "color-oklch-hue", oklchHue: 142 },
      icon: { type: "icon-lucide", iconName: "book" },
      description: "",
      type: "database-v2",
      transcriberIdentifier: "source-transcriber",
    },
    repoId,
    [
      {
        kind: "transcriber",
        identifier: "source-transcriber",
        id: transcriberId,
      },
    ],
  );
  const transcriber = serializeResource(
    "transcriber",
    { name: "Transcriber", version: "transcriber-v2" },
    transcriberId,
    [],
  );
  const repoFile = join(root, "repository.tar");
  await createResourceArchive(
    repo,
    (async function* () {
      yield {
        path: "file.txt",
        content: (async function* () {
          yield Buffer.from("file bytes");
        })(),
        contentType: "text/plain",
      };
    })(),
    repoFile,
  );
  const transcriberFile = join(root, "transcriber.tar");
  await createResourceArchive(
    transcriber,
    (async function* () {})(),
    transcriberFile,
  );
  const sources = onlyDistribution ? [] : [repoFile, transcriberFile];
  if (distribution || onlyDistribution) {
    const dir = join(root, "model");
    await mkdir(dir);
    await writeFile(
      join(dir, "xrag.json"),
      JSON.stringify({
        xrag_version: 1,
        xrag_type: "files",
        name: "fixture",
        targets: ["ollama"],
      }),
    );
    await writeFile(join(dir, "payload"), "platform bytes");
    const file = join(root, "platform.tar");
    await c({ cwd: dir, file }, ["xrag.json", "payload"]);
    sources.push(file);
  }
  const file = single ? sources[0]! : join(root, "collection.tar");
  if (!single) await createCollection(sources, file);
  const inspected = await inspectArchive(createReadStream(file));
  const bytes = await readFile(file);
  const backend = importBackend();
  backend.objects.set(`xrag-transfers/${path}`, bytes);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const params = new URL(url).searchParams;
      const bytes = backend.objects.get(
        `${params.get("bucket")}/${params.get("path")}`,
      );
      return bytes ? new Response(bytes) : new Response(null, { status: 404 });
    }),
  );
  const service = backend.client;
  const rpc = service.rpc.getMockImplementation()!;
  service.rpc.mockImplementation(async (name, args) =>
    name === "xrag_resource_revision"
      ? { data: existing ? revision : null, error: null }
      : rpc(name, args),
  );
  operations.client = service;
  const uploads = backend.upload;
  const options = {
    supabase: {},
    supabaseServiceRole: service,
    authenticated: { userId, claims },
  };
  const input = {
    source: { path, digest: inspected.id },
    target: { workspaceId: "workspace" },
    confirmedRevisions: existing
      ? { [repoId]: revision, [transcriberId]: revision }
      : {},
  };
  return { input, options, service, uploads, repo, transcriber, backend };
}
it("previews conflicts and imports separately identified resources with preserved links", async () => {
  const f = await fixture({ existing: true });
  const preview = await previewXRAGImport(f.input, f.options as any);
  expect(preview.digest).toBe(f.input.source.digest);
  expect(preview.entries.map((entry) => entry.revision)).toEqual([
    revision,
    revision,
  ]);
  const result = await importXRAGTransfer(f.input, f.options as any);
  const repoLocal = importedResourceId(
    "workspace",
    "documentRepository",
    repoId,
  );
  const transcriberLocal = importedResourceId(
    "workspace",
    "transcriber",
    transcriberId,
  );
  expect(result.imported).toEqual(
    expect.arrayContaining([
      { kind: "documentRepository", originId: repoId, localId: repoLocal },
      {
        kind: "transcriber",
        originId: transcriberId,
        localId: transcriberLocal,
      },
    ]),
  );
  const call = f.service.rpc.mock.calls.find(
    ([name]) => name === "begin_xrag_import",
  ) as any;
  expect(
    call[1].p_plan.entries.find(
      (entry: any) => entry.kind === "documentRepository",
    ).config.transcriberIdentifier,
  ).toBe(transcriberLocal);
  expect(result.documentFileCount).toBe(1);
  expect(
    f.backend.objects
      .get(`database_files/workspace/${repoLocal}/file.txt`)
      ?.toString(),
  ).toBe("file bytes");
});
it("imports new resources without replacement confirmation", async () => {
  const f = await fixture({
    claims: [{ organization_id: "workspace", role: "workspace-admin" }],
  });
  const preview = await previewXRAGImport(f.input, f.options as any);
  expect(preview.entries.every((entry) => entry.revision === null)).toBe(true);
  await importXRAGTransfer(f.input, f.options as any);
  expect(
    f.uploads.mock.calls.filter(([bucket]) => bucket === "database_files"),
  ).toHaveLength(1);
  expect(
    [...f.backend.objects.keys()].every((key) =>
      key.startsWith("database_files/"),
    ),
  ).toBe(true);
  expect(f.backend.prepared.size).toBe(0);
});
it("rejects a mixed package in full for workspace administrators", async () => {
  const f = await fixture({
    distribution: true,
    claims: [{ organization_id: "workspace", role: "workspace-admin" }],
  });
  await expect(importXRAGTransfer(f.input, f.options as any)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(f.service.rpc).not.toHaveBeenCalled();
  expect(
    f.uploads.mock.calls.filter(([bucket]) => bucket !== "xrag-prepared"),
  ).toHaveLength(0);
  expect(
    f.uploads.mock.calls.filter(([bucket]) => bucket !== "xrag-prepared"),
  ).toHaveLength(0);
});
it("publishes distribution contents only after all resource checks pass", async () => {
  const f = await fixture({ distribution: true });
  const preview = await previewXRAGImport(f.input, f.options as any);
  expect(preview.entries.map((entry) => entry.kind)).toContain("files");
  const result = await importXRAGTransfer(f.input, f.options as any);
  expect(result.publications).toEqual(["publication-id"]);
  expect(f.backend.copy).toHaveBeenCalledWith(
    "xrag-prepared",
    expect.any(String),
    expect.stringMatching(/^uploads\//),
    "box-action-files",
  );
});
it("creates a new workspace even for a distribution-only import", async () => {
  const f = await fixture({ onlyDistribution: true });
  await importXRAGTransfer(
    {
      ...f.input,
      target: {
        workspaceId: "new-workspace",
        newWorkspaceName: "New workspace",
      },
    },
    f.options as any,
  );
  expect(f.service.rpc).toHaveBeenCalledWith(
    "begin_xrag_import",
    expect.objectContaining({
      p_plan: expect.objectContaining({
        target: {
          workspaceId: "new-workspace",
          newWorkspaceName: "New workspace",
        },
        entries: [],
      }),
    }),
  );
});
it("imports distribution-only packages into existing workspaces without resource writes", async () => {
  const f = await fixture({ onlyDistribution: true });
  await importXRAGTransfer(f.input, f.options as any);
  expect(f.service.rpc).toHaveBeenCalledWith(
    "commit_xrag_import",
    expect.anything(),
  );
});
it("does not copy files or publish anything when replacement confirmation is missing", async () => {
  const f = await fixture({ existing: true, distribution: true });
  await expect(
    importXRAGTransfer(
      { ...f.input, confirmedRevisions: {} },
      f.options as any,
    ),
  ).rejects.toThrow("XRAG_IMPORT_CONFLICT");
  expect(
    f.uploads.mock.calls.filter(([bucket]) => bucket !== "xrag-prepared"),
  ).toHaveLength(0);
  expect(
    [...f.backend.jobs.values()].some((j) => j.state === "committed"),
  ).toBe(false);
});

it("inspects contents before choosing a workspace and imports only checked objects", async () => {
  const f = await fixture({
    claims: [{ organization_id: "workspace", role: "workspace-admin" }],
  });
  const contents = await inspectXRAGTransfer(
    { source: f.input.source },
    f.options as any,
  );
  expect(contents.entries.map((entry) => entry.name).sort()).toEqual([
    "Files",
    "Transcriber",
  ]);
  expect(
    contents.entries.find((entry) => entry.kind === "documentRepository"),
  ).toMatchObject({
    color: { type: "color-oklch-hue", oklchHue: 142 },
    icon: { type: "icon-lucide", iconName: "book" },
  });
  expect(contents.entries.every((entry) => entry.needsWorkspace)).toBe(true);
  expect(JSON.stringify(contents)).not.toContain("config");
  const selectedEntries = [
    contents.entries.find((entry) => entry.kind === "transcriber")!.archiveId,
  ];
  const preview = await previewXRAGImport(
    { ...f.input, selectedEntries },
    f.options as any,
  );
  expect(preview.entries).toHaveLength(1);
  const result = await importXRAGTransfer(
    { ...f.input, selectedEntries },
    f.options as any,
  );
  expect(result.imported).toHaveLength(1);
  expect(result.imported[0]!.kind).toBe("transcriber");
  expect(
    f.uploads.mock.calls.filter(([bucket]) => bucket !== "xrag-prepared"),
  ).toHaveLength(0);
});
it("requires a workspace only for selected resources, and does not create one for platform-only imports", async () => {
  const f = await fixture({ distribution: true });
  const contents = await inspectXRAGTransfer(
    { source: f.input.source },
    f.options as any,
  );
  const selectedEntries = [
    contents.entries.find((entry) => entry.kind === "files")!.archiveId,
  ];
  await expect(
    previewXRAGImport({ ...f.input, target: undefined }, f.options as any),
  ).rejects.toThrow("XRAG_WORKSPACE_REQUIRED");
  const input = { ...f.input, target: undefined, selectedEntries };
  const preview = await previewXRAGImport(input, f.options as any);
  expect(preview.entries.map((entry) => entry.kind)).toEqual(["files"]);
  const result = await importXRAGTransfer(input, f.options as any);
  expect(result.workspaceId).toBeNull();
  expect(result.publications).toEqual(["publication-id"]);
  expect(result.imported).toEqual([]);
  expect(f.service.rpc).toHaveBeenCalledWith(
    "commit_xrag_import",
    expect.anything(),
  );
});
it("rejects unknown, duplicate and empty selections without writes", async () => {
  const f = await fixture();
  const contents = await inspectXRAGTransfer(
    { source: f.input.source },
    f.options as any,
  );
  for (const selectedEntries of [
    [],
    ["f".repeat(64)],
    [contents.entries[0]!.archiveId, contents.entries[0]!.archiveId],
  ]) {
    await expect(
      importXRAGTransfer({ ...f.input, selectedEntries }, f.options as any),
    ).rejects.toThrow();
  }
  expect(f.service.rpc).not.toHaveBeenCalled();
  expect(
    f.uploads.mock.calls.filter(([bucket]) => bucket !== "xrag-prepared"),
  ).toHaveLength(0);
});
it("still rejects forbidden package contents when those entries were deselected", async () => {
  const f = await fixture({ distribution: true });
  const contents = await inspectXRAGTransfer(
    { source: f.input.source },
    f.options as any,
  );
  const selectedEntries = contents.entries
    .filter((entry) => entry.needsWorkspace)
    .map((entry) => entry.archiveId);
  f.options.authenticated.claims = [
    { organization_id: "workspace", role: "workspace-admin" },
  ];
  await expect(
    inspectXRAGTransfer({ source: f.input.source }, f.options as any),
  ).rejects.toThrow("NOT_AUTHORIZED");
  await expect(
    importXRAGTransfer({ ...f.input, selectedEntries }, f.options as any),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(
    [...f.backend.jobs.values()].some((j) => j.state === "committed"),
  ).toBe(false);
  expect(
    f.uploads.mock.calls.filter(([bucket]) => bucket !== "xrag-prepared"),
  ).toHaveLength(0);
});

it("restores overwritten files and sidecars and removes new files when metadata commit fails", async () => {
  const f = await fixture({ existing: true, distribution: true });
  const prefix = `database_files/workspace/${importedResourceId("workspace", "documentRepository", repoId)}/file.txt`;
  f.backend.objects.set(prefix, Buffer.from("previous bytes"));
  f.backend.objects.set(
    `${prefix}.__xrag_content.mdc`,
    Buffer.from("previous text"),
  );
  f.backend.objects.set(
    prefix.replace("file.txt", "unrelated.txt"),
    Buffer.from("keep"),
  );
  f.backend.failCommit("before");
  await expect(importXRAGTransfer(f.input, f.options as any)).rejects.toThrow(
    "XRAG_IMPORT_COMMIT_UNCERTAIN",
  );
  expect(f.backend.objects.get(prefix)?.toString()).toBe("previous bytes");
  expect(
    f.backend.objects.get(`${prefix}.__xrag_content.mdc`)?.toString(),
  ).toBe("previous text");
  expect([...f.backend.objects.values()].map((b) => b.toString())).toEqual(
    expect.arrayContaining(["keep", "previous bytes", "previous text"]),
  );
  expect(
    [...f.backend.objects.keys()].filter(
      (key) => !key.startsWith("xrag-prepared/"),
    ),
  ).toHaveLength(3);
  expect([...f.backend.jobs.values()][0].state).toBe("rolled_back");
});
it("does not undo a successful commit when its response is lost", async () => {
  const f = await fixture();
  f.backend.failCommit("after");
  await expect(
    importXRAGTransfer(f.input, f.options as any),
  ).resolves.toMatchObject({ documentFileCount: 1 });
  const job = [...f.backend.jobs.values()][0];
  expect(job.state).toBe("committed");
  expect(f.backend.prepared.size).toBe(0);
  expect(f.backend.objects.size).toBe(1);
  await recoverXRAGImport(job.id, { supabase: f.service as any });
  expect(f.backend.objects.size).toBe(1);
});
it("does not touch target files when staging or backup fails", async () => {
  for (const phase of ["upload", "backup"] as const) {
    const f = await fixture();
    const prefix = `database_files/workspace/${importedResourceId("workspace", "documentRepository", repoId)}/file.txt`;
    f.backend.objects.set(prefix, Buffer.from("original"));
    if (phase === "upload")
      f.backend.upload.mockResolvedValueOnce({
        data: {},
        error: new Error("upload failed"),
      });
    else
      f.backend.copy.mockResolvedValueOnce({
        error: new Error("backup failed"),
      });
    await expect(
      importXRAGTransfer(f.input, f.options as any),
    ).rejects.toThrow();
    expect(f.backend.objects.get(prefix)?.toString()).toBe("original");
    expect(f.backend.remove).not.toHaveBeenCalledWith(
      "database_files",
      expect.anything(),
    );
    expect(
      [...f.backend.objects.keys()].filter((key) =>
        key.startsWith("database_files/"),
      ),
    ).toHaveLength(1);
  }
});
it("retains undo copies after failed recovery and resumes it after a restart", async () => {
  const f = await fixture();
  const prefix = `database_files/workspace/${importedResourceId("workspace", "documentRepository", repoId)}/file.txt`;
  f.backend.objects.set(prefix, Buffer.from("original"));
  const copy = f.backend.copy.getMockImplementation()!;
  f.backend.failCommit("before");
  let fail = true;
  f.backend.copy.mockImplementation(async (bucket, from, to, destination) => {
    if (fail && bucket === "xrag-import-staging")
      return { error: new Error("Storage offline") };
    return copy(bucket, from, to, destination);
  });
  await expect(importXRAGTransfer(f.input, f.options as any)).rejects.toThrow(
    "XRAG_IMPORT_RECOVERY_FAILED",
  );
  const job = [...f.backend.jobs.values()][0];
  expect(job.state).toBe("rolling_back");
  expect(
    f.backend.objects
      .get(`xrag-import-staging/${job.plan.files[0].backup}`)
      ?.toString(),
  ).toBe("original");
  fail = false;
  await recoverXRAGImport(job.id, { supabase: f.service as any });
  expect(f.backend.objects.get(prefix)?.toString()).toBe("original");
  expect(
    [...f.backend.objects.keys()].filter(
      (key) => !key.startsWith("xrag-prepared/"),
    ),
  ).toHaveLength(1);
  expect(job.state).toBe("rolled_back");
});
it("clears stale extracted content only on a successful replacement", async () => {
  const f = await fixture();
  const prefix = `database_files/workspace/${importedResourceId("workspace", "documentRepository", repoId)}/file.txt`;
  f.backend.objects.set(prefix, Buffer.from("original"));
  f.backend.objects.set(`${prefix}.__xrag_content.mdc`, Buffer.from("stale"));
  await importXRAGTransfer(f.input, f.options as any);
  expect(f.backend.objects.get(prefix)?.toString()).toBe("file bytes");
  expect(f.backend.objects.has(`${prefix}.__xrag_content.mdc`)).toBe(false);
});

it("prepares a single repository once, deletes its archive and installs directly from extracted files", async () => {
  const f = await fixture({ single: true });
  await inspectXRAGTransfer({ source: f.input.source }, f.options as any);
  expect(f.backend.objects.has(`xrag-transfers/${path}`)).toBe(false);
  expect([...f.backend.objects.keys()]).toHaveLength(1);
  expect([...f.backend.objects.keys()][0]).toMatch(
    /^xrag-prepared\/.*\/files\/0$/,
  );
  const fetches = vi.mocked(fetch).mock.calls.length;
  await previewXRAGImport(f.input, f.options as any);
  expect(vi.mocked(fetch).mock.calls.length).toBe(fetches);
  await importXRAGTransfer(f.input, f.options as any);
  expect(vi.mocked(fetch).mock.calls.length).toBe(fetches);
  expect([...f.backend.objects.keys()]).toHaveLength(1);
  expect([...f.backend.objects.keys()][0]).toMatch(/^database_files\//);
  expect(f.backend.prepared.size).toBe(0);
  expect(
    f.backend.upload.mock.calls.some(
      ([bucket]) => bucket === "xrag-import-staging",
    ),
  ).toBe(false);
});
it("keeps only selected distribution artifacts and consumes unselected contents", async () => {
  const f = await fixture({ distribution: true });
  const contents = await inspectXRAGTransfer(
    { source: f.input.source },
    f.options as any,
  );
  expect(f.backend.objects.has(`xrag-transfers/${path}`)).toBe(false);
  expect([...f.backend.objects.keys()]).toHaveLength(3);
  const selectedEntries = contents.entries
    .filter((entry) => entry.kind === "files")
    .map((entry) => entry.archiveId);
  await importXRAGTransfer({ ...f.input, selectedEntries }, f.options as any);
  expect([...f.backend.objects.keys()]).toHaveLength(1);
  expect([...f.backend.objects.keys()][0]).toMatch(/^box-action-files\//);
  expect(f.backend.prepared.size).toBe(0);
});
it("retains a single distribution archive until its artifact copy is committed", async () => {
  const f = await fixture({ single: true, onlyDistribution: true });
  await inspectXRAGTransfer({ source: f.input.source }, f.options as any);
  expect([...f.backend.objects.keys()]).toEqual([`xrag-transfers/${path}`]);
  await importXRAGTransfer(f.input, f.options as any);
  expect([...f.backend.objects.keys()]).toHaveLength(1);
  expect([...f.backend.objects.keys()][0]).toMatch(/^box-action-files\//);
});
it("retries failed post-commit cleanup without undoing the installed resources", async () => {
  const f = await fixture({ single: true });
  await inspectXRAGTransfer({ source: f.input.source }, f.options as any);
  const remove = f.backend.remove.getMockImplementation()!;
  f.backend.remove.mockImplementation(async (bucket, paths) =>
    bucket === "xrag-prepared"
      ? { error: new Error("offline") }
      : remove(bucket, paths),
  );
  await expect(
    importXRAGTransfer(f.input, f.options as any),
  ).resolves.toMatchObject({ documentFileCount: 1 });
  const job = [...f.backend.jobs.values()][0];
  expect(job.state).toBe("committed");
  expect(f.backend.prepared.size).toBe(1);
  f.backend.remove.mockImplementation(remove);
  await recoverXRAGImport(job.id, { supabase: f.service as any });
  expect(f.backend.prepared.size).toBe(0);
  expect([...f.backend.objects.keys()]).toHaveLength(1);
});
it("keeps a valid selection after a stale digest or invalid preview selection", async () => {
  const f = await fixture();
  const inspected = await inspectXRAGTransfer(
    { source: f.input.source },
    f.options as any,
  );
  await expect(
    inspectXRAGTransfer(
      { source: { ...f.input.source, digest: "f".repeat(64) } },
      f.options as any,
    ),
  ).rejects.toThrow("XRAG_CHECKSUM_MISMATCH");
  await expect(
    previewXRAGImport(
      { ...f.input, selectedEntries: ["f".repeat(64)] },
      f.options as any,
    ),
  ).rejects.toThrow();
  expect(
    await inspectXRAGTransfer({ source: f.input.source }, f.options as any),
  ).toEqual(inspected);
});
it("reuses a published inventory after retrying failed source cleanup", async () => {
  const f = await fixture();
  f.backend.remove.mockResolvedValueOnce({ error: new Error("offline") });
  await expect(
    inspectXRAGTransfer({ source: f.input.source }, f.options as any),
  ).rejects.toThrow("XRAG_TRANSFER_DELETE_FAILED");
  expect(f.backend.prepared.size).toBe(1);
  await inspectXRAGTransfer({ source: f.input.source }, f.options as any);
  expect(f.backend.objects.has(`xrag-transfers/${path}`)).toBe(false);
});
it.each([new Error("connection lost"), null])(
  "preserves files when the verification read cannot see the published inventory (%s)",
  async (error) => {
    const f = await fixture();
    const from = f.service.from.getMockImplementation()!;
    let reads = 0;
    f.service.from.mockImplementation((table: string) => {
      if (table === "xrag_prepared_uploads" && ++reads === 3)
        return query({ data: null, error });
      return from(table);
    });
    await expect(
      inspectXRAGTransfer({ source: f.input.source }, f.options as any),
    ).rejects.toThrow("XRAG_PREPARATION_UNCERTAIN");
    expect(f.backend.prepared.size).toBe(1);
    expect(
      [...f.backend.objects.keys()].some((key) =>
        key.startsWith("xrag-prepared/"),
      ),
    ).toBe(true);
    await expect(
      inspectXRAGTransfer({ source: f.input.source }, f.options as any),
    ).resolves.toHaveProperty("digest");
  },
);
it("does not publish a truncated prepared child", async () => {
  const f = await fixture();
  const upload = f.backend.upload.getMockImplementation()!;
  f.backend.upload.mockImplementation(async (bucket, path, body) => {
    const result = await upload(bucket, path, body);
    f.backend.objects.set(`${bucket}/${path}`, Buffer.alloc(0));
    return result;
  });
  await expect(
    inspectXRAGTransfer({ source: f.input.source }, f.options as any),
  ).rejects.toThrow("XRAG_PREPARATION_FAILED");
  expect(f.backend.prepared.size).toBe(0);
  expect([...f.backend.objects.keys()]).toEqual([`xrag-transfers/${path}`]);
});

it("expires selections after one hour even before the cleanup sweep runs", async () => {
  const f = await fixture();
  await inspectXRAGTransfer({ source: f.input.source }, f.options as any);
  for (const entry of f.backend.prepared.values())
    entry.created_at = new Date(Date.now() - 3600_001).toISOString();
  await expect(importXRAGTransfer(f.input, f.options as any)).rejects.toThrow(
    "XRAG_TRANSFER_EXPIRED",
  );
  expect(f.backend.prepared.size).toBe(1); // The scheduler owns expiration cleanup.
});
