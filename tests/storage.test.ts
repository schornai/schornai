import { loadMessageFiles } from "../packages/database/src/chat/loadMessageFiles";
import { describe, expect, it, vi } from "vitest";
import { StorageSession } from "../packages/database/src/storage/_utils/StorageSession";
import { agentToStoragePath } from "../packages/database/src/storage/_utils/agentToStoragePath";
import {
  toStorageObjectArray,
  MDC_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
  EMPTY_FOLDER_PLACEHOLDER,
} from "../packages/database/src/storage/_utils/toStorageObjectArray";
import { list } from "../packages/database/src/storage/list";
import { inspect } from "../packages/database/src/storage/inspect";
import { createFile } from "../packages/database/src/storage/createFile";
import { createFolder } from "../packages/database/src/storage/createFolder";
import { getDocumentBlob } from "../packages/database/src/storage/getDocumentBlob";
import { getDocumentContent } from "../packages/database/src/storage/getDocumentContent";
import { clearDocumentContent } from "../packages/database/src/storage/clearDocumentContent";
import { saveDocumentContent } from "../packages/database/src/storage/saveDocumentContent";
import { createDocumentTranscription } from "../packages/database/src/storage/createDocumentTranscription";
import { remove } from "../packages/database/src/storage/remove";

const row = (name: string, file = true) => ({
  name,
  metadata: file ? { size: 5, mimetype: "text/plain" } : null,
  created_at: null,
  updated_at: null,
});
function session(
  rows: Record<string, ReturnType<typeof row>[]> = {},
  blobs: Record<string, Blob> = {},
) {
  const api = {
    list: vi.fn(async (path: string, options: { search?: string }) => ({
      data: (rows[path] ?? []).filter(
        (r) => !options.search || r.name.includes(options.search),
      ),
      error: null as unknown,
    })),
    upload: vi.fn(async () => ({ error: null as unknown })),
    download: vi.fn(async (path: string) => ({ data: blobs[path] ?? null })),
    remove: vi.fn(async () => ({ error: null as unknown })),
  };
  const logAction = vi.fn();
  const storageSession = {
    getStoragePath: (path: string) => ({
      storagePath: path,
      resolvedPath: path,
    }),
    supabaseStorage: api,
    abortSignal: new AbortController().signal,
    logAction,
  } as any;
  return { api, storageSession, logAction };
}
const file = {
  file: true as const,
  name: "file.txt",
  path: "folder/file.txt",
  size: 5,
  type: "text/plain",
  createdAtISO: "1970-01-01T00:00:00.000Z",
  updatedAtISO: "1970-01-01T00:00:00.000Z",
};

describe("storage namespace isolation", () => {
  it.each([
    [
      { type: "activity", agentId: "agent", activityId: "activity" },
      "activity_chat___activity_agent/a/file",
    ],
    [
      {
        type: "activity-transcription",
        transcriberId: "transcriber",
        activityId: "activity",
      },
      "activity_transcription__activity_transcriber/a/file",
    ],
    [
      {
        type: "documentRepository",
        documentRepositoryId: "repo",
        workspaceId: "workspace",
      },
      "workspace/repo/a/file",
    ],
    [
      { type: "documentRepository", documentRepositoryId: "repo" },
      "not_set/repo/a/file",
    ],
  ])("resolves paths for %j", (storage, expected) => {
    const from = vi.fn(() => ({ bucket: "bucket" }));
    const abortSignal = new AbortController().signal;
    const s = new StorageSession({
      storage,
      supabaseStorage: { from },
      abortSignal,
    } as any);
    expect(s.getStoragePath("/a/./file")).toEqual({
      resolvedPath: "a/file",
      storagePath: expected,
    });
    expect(s.storage).toEqual(storage);
    expect(s.abortSignal).toBe(abortSignal);
    expect(s.supabaseStorage).toEqual({ bucket: "bucket" });
    expect(from).toHaveBeenCalledWith(s.storageName);
  });
  it("provides default cancellation and rejects unknown storage types", () => {
    const s = new StorageSession({
      storage: { type: "activity", agentId: "a", activityId: "b" },
      supabaseStorage: { from: () => ({}) },
    } as any);
    expect(s.abortSignal.aborted).toBe(false);
    expect(() => StorageSession.getStorageName("invalid" as any)).toThrow(
      "ExhaustiveError",
    );
    expect(() =>
      StorageSession.getStoragePath("", { type: "invalid" } as any),
    ).toThrow("ExhaustiveError");
  });
  it("maps conversation paths and repositories, respects mount boundaries and picks the deepest mount", () => {
    const config = {
      activityId: "activity",
      agentId: "agent",
      mountedDocumentRepositories: [
        { id: "repo", identifier: "docs", workspaceId: "workspace" },
      ],
      mounts: [
        {
          mount: "docs",
          documentRepositoryIdentifier: "docs",
          pathRepository: "base",
          permission: "read-only",
        },
        {
          mount: "docs/sub",
          documentRepositoryIdentifier: "docs",
          pathRepository: "specific",
          permission: "write",
        },
      ],
    } as any;
    expect(
      agentToStoragePath({ ...config, path: "this_conversation/file.txt" }),
    ).toMatchObject({
      path: "file.txt",
      permission: "write",
      storage: { type: "activity" },
    });
    expect(
      agentToStoragePath({
        ...config,
        path: "/this_conversation/web/example.com/index.html",
      }),
    ).toMatchObject({
      path: "web/example.com/index.html",
      storage: { type: "activity" },
    });
    expect(
      agentToStoragePath({ ...config, path: "/docs/sub/file" }),
    ).toMatchObject({ path: "specific/file", permission: "write" });
    expect(
      agentToStoragePath({
        ...config,
        path: "/web/example.com/index.html",
        mounts: [{ ...config.mounts[0], mount: "/", pathRepository: "/base/" }],
      }),
    ).toMatchObject({
      path: "base/web/example.com/index.html",
      storage: { type: "documentRepository" },
    });
    expect(
      agentToStoragePath({ ...config, path: "this_conversation" })!.path,
    ).toBe("");
    expect(
      agentToStoragePath({ ...config, path: "docs/sub/file" }),
    ).toMatchObject({ path: "specific/file", permission: "write" });
    expect(agentToStoragePath({ ...config, path: "docs/file" })).toMatchObject({
      path: "base/file",
      permission: "read-only",
    });
    expect(
      agentToStoragePath({ ...config, path: "docs-other/file" }),
    ).toBeUndefined();
    expect(agentToStoragePath({ ...config, path: "missing" })).toBeUndefined();
    for (const path of [
      "docs/．．/secret",
      "docs／．．／secret",
      "docs/.?./secret",
    ])
      expect(agentToStoragePath({ ...config, path })).toBeUndefined();
    expect(
      agentToStoragePath({
        ...config,
        mountedDocumentRepositories: [],
        path: "docs/file",
      }),
    ).toBeUndefined();
  });
});

describe("storage listing and inspection", () => {
  it("hides sidecars and placeholders, exposes readable content and supports showAll", () => {
    const rows = [
      row("file.txt"),
      row("file.txt" + MDC_FILE_EXTENSION),
      row("audio.mp3"),
      row("audio.mp3" + TRANSCRIPT_FILE_EXTENSION),
      row(EMPTY_FOLDER_PLACEHOLDER),
      row("subfolder", false),
    ];
    const result = toStorageObjectArray("folder", rows as any);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ ...file, readableContent: "text" });
    expect(result[1]).toMatchObject({ readableContent: "transcript" });
    expect(result[2]).toEqual({
      folder: true,
      name: "subfolder",
      path: "folder/subfolder",
    });
    expect(
      toStorageObjectArray("", rows as any, { showAll: true }),
    ).toHaveLength(6);
    expect(toStorageObjectArray("", [row("root")] as any)[0]!.path).toBe(
      "root",
    );
    const dated = {
      ...row("date"),
      created_at: "2026-10-01",
      updated_at: "2026-10-07",
    };
    expect(toStorageObjectArray("", [dated] as any)[0]).toMatchObject({
      createdAtISO: "2026-10-01T00:00:00.000Z",
      updatedAtISO: "2026-10-07T00:00:00.000Z",
    });
  });
  it("sorts list results, finds exact file names and avoids a root lookup", async () => {
    const { api, storageSession } = session({
      folder: [row("z"), row("a"), row("ab")],
    });
    expect((await list("folder", storageSession)).map((f) => f.name)).toEqual([
      "a",
      "ab",
      "z",
    ]);
    expect(api.list).toHaveBeenCalledWith(
      "folder",
      {
        limit: 1000,
        offset: 0,
        search: undefined,
        sortBy: { column: "name", order: "asc" },
      },
      { signal: storageSession.abortSignal },
    );
    expect(await inspect("folder/a", storageSession)).toMatchObject({
      name: "a",
    });
    expect(await inspect("folder/missing", storageSession)).toBeUndefined();
    api.list.mockClear();
    expect(await inspect("/", storageSession)).toEqual({
      folder: true,
      name: "",
      path: "",
    });
    expect(api.list).not.toHaveBeenCalled();
  });
  it("propagates failed listings", async () => {
    const { api, storageSession } = session();
    const error = new Error("list failed");
    api.list.mockResolvedValue({ data: [], error });
    await expect(list("folder", storageSession)).rejects.toBe(error);
    await expect(inspect("folder/a", storageSession)).rejects.toBe(error);
  });
});

describe("storage reads", () => {
  it("returns file blobs, treats folders and absent downloads as missing", async () => {
    const blob = new Blob(["text"]);
    const { storageSession } = session(
      { folder: [row("file.txt"), row("missing"), row("sub", false)] },
      { "folder/file.txt": blob },
    );
    expect(await getDocumentBlob("folder/file.txt", storageSession)).toBe(blob);
    expect(
      await getDocumentBlob("folder/missing", storageSession),
    ).toBeUndefined();
    expect(await getDocumentBlob("folder/sub", storageSession)).toBeUndefined();
  });
  it("loads a recorded audio transcript from storage into model-readable chat text", async () => {
    const path = "recording.webm";
    const transcript = {
      segments: [
        {
          noSpeechProbability: 0,
          timeStart: 0,
          timeEnd: 2,
          words: [
            { word: " Meeting", probability: 1, timeStart: 0, timeEnd: 1 },
            {
              word: " tomorrow.",
              wordOverride: " Friday.",
              probability: 1,
              timeStart: 1,
              timeEnd: 2,
            },
          ],
        },
      ],
    };
    const { storageSession } = session(
      { "": [row(path), row(path + TRANSCRIPT_FILE_EXTENSION)] },
      {
        [path + TRANSCRIPT_FILE_EXTENSION]: new Blob([
          JSON.stringify(transcript),
        ]),
      },
    );
    const result = await loadMessageFiles(
      [
        {
          id: "recording",
          role: "user",
          parts: [
            {
              type: "data-file",
              data: {
                name: path,
                url: path,
                type: "audio/webm",
              },
            },
          ],
        },
      ],
      storageSession,
    );
    expect(result[0].parts[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("Meeting Friday."),
    });
    expect(JSON.stringify(result)).not.toContain("probability");
  });
  it("reads text sidecars, direct text/code, transcripts and unsupported files", async () => {
    const rows = {
      folder: [
        row("file.txt"),
        row("code.ts"),
        row("empty.txt"),
        row("pdf.pdf" + MDC_FILE_EXTENSION),
        row("file.txt" + MDC_FILE_EXTENSION),
        row("audio.mp3" + TRANSCRIPT_FILE_EXTENSION),
      ],
    };
    const blobs = {
      "folder/file.txt": new Blob(["direct"]),
      ["folder/file.txt" + MDC_FILE_EXTENSION]: new Blob(["sidecar"]),
      "folder/code.ts": new Blob(["const a = 1;"]),
      "folder/empty.txt": new Blob([""]),
      ["folder/pdf.pdf" + MDC_FILE_EXTENSION]: new Blob(["converted"]),
      ["folder/audio.mp3" + TRANSCRIPT_FILE_EXTENSION]: new Blob([
        '{"segments":[]}',
      ]),
    };
    const { storageSession } = session(rows, blobs);
    expect(await getDocumentContent("folder/file.txt", storageSession)).toEqual(
      { type: "mdc", current: "sidecar", versions: [] },
    );
    expect(
      await getDocumentContent("folder/code.ts", storageSession),
    ).toMatchObject({ current: "const a = 1;" });
    expect(
      await getDocumentContent("folder/pdf.pdf", storageSession),
    ).toMatchObject({ current: "converted" });
    expect(
      await getDocumentContent("folder/missing.pdf", storageSession),
    ).toBeUndefined();
    expect(
      await getDocumentContent("folder/empty.txt", storageSession),
    ).toEqual({ current: "", type: "mdc", versions: [] });
    expect(
      await getDocumentContent("folder/audio.mp3", storageSession),
    ).toEqual({ type: "transcript", segments: [] });
    expect(
      await getDocumentContent("folder/binary.unknown", storageSession),
    ).toBeUndefined();
    expect(
      await getDocumentContent("folder/missing.mp3", storageSession),
    ).toBeUndefined();
  });
});

describe("storage writes and logging", () => {
  it("invalidates old extracted text and transcripts without deleting the downloaded file", async () => {
    const { storageSession, api } = session();
    await clearDocumentContent("web/example.com/index.html", storageSession);
    expect(api.remove).toHaveBeenCalledExactlyOnceWith([
      `web/example.com/index.html${MDC_FILE_EXTENSION}`,
      `web/example.com/index.html${TRANSCRIPT_FILE_EXTENSION}`,
    ]);
    api.remove.mockResolvedValue({ error: new Error("denied") });
    await expect(
      clearDocumentContent("file.pdf", storageSession),
    ).rejects.toThrow("denied");
  });
  it("creates empty folders and files and logs returned metadata", async () => {
    const { storageSession, api, logAction } = session();
    await createFolder("folder", storageSession);
    expect(api.upload).toHaveBeenCalledWith(
      `folder/${EMPTY_FOLDER_PLACEHOLDER}`,
      expect.any(Blob),
      { upsert: true },
    );
    expect(logAction).toHaveBeenLastCalledWith({
      state: "created",
      target: { folder: true, name: "folder", path: "folder" },
    });
    const blob = new Blob(["text"], { type: "text/plain" });
    expect(
      await createFile(blob, "folder/file.txt", storageSession),
    ).toMatchObject({ size: 4, name: "file.txt", readableContent: undefined });
    expect(
      await createFile(undefined, "folder/file.pdf", storageSession),
    ).toMatchObject({ size: 0, readableContent: "text" });
  });
  it("propagates upload failures and rejects cancelled uploads before writing", async () => {
    const { storageSession, api } = session();
    const error = new Error("upload failed");
    api.upload.mockResolvedValue({ error });
    await expect(createFile(undefined, "a", storageSession)).rejects.toBe(
      error,
    );
    await expect(createFolder("a", storageSession)).rejects.toBe(error);
    await expect(
      createDocumentTranscription(file, { segments: [] }, storageSession),
    ).rejects.toBe(error);
    storageSession.abortSignal = AbortSignal.abort();
    api.upload.mockClear();
    await expect(
      createFile(undefined, "a", storageSession),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(api.upload).not.toHaveBeenCalled();
  });
  it("saves transcription sidecars and logs their content", async () => {
    const { storageSession, api, logAction } = session();
    await createDocumentTranscription(file, { segments: [] }, storageSession);
    expect(api.upload).toHaveBeenCalledWith(
      file.path + TRANSCRIPT_FILE_EXTENSION,
      '{"segments":[]}',
      { upsert: true },
    );
    expect(logAction).toHaveBeenCalledWith({
      target: file,
      state: "created",
      content: { type: "transcript", segments: [] },
    });
    await saveDocumentContent(
      file,
      { type: "transcript", segments: [] },
      storageSession,
    );
    expect(logAction).toHaveBeenLastCalledWith({
      target: file,
      state: "created",
      content: { type: "transcript", segments: [] },
    });
  });
  it("versions text edits, skips unchanged writes and logs write failures", async () => {
    const { storageSession, api, logAction } = session(
      { folder: [row("file.txt")] },
      { [file.path]: new Blob(["old"]) },
    );
    const content = { type: "mdc" as const, current: "new", versions: [] };
    await saveDocumentContent(file, content, storageSession);
    expect(api.upload.mock.calls[0]![1]).toContain("## Version 1");
    api.upload.mockClear();
    await saveDocumentContent(
      file,
      { ...content, current: "old" },
      storageSession,
    );
    expect(api.upload).not.toHaveBeenCalled();
    api.upload.mockResolvedValue({ error: new Error("failed") });
    await saveDocumentContent(file, content, storageSession);
    expect(logAction).toHaveBeenLastCalledWith({
      target: file,
      state: "error",
      message: "Error: failed",
    });
    await saveDocumentContent(
      file,
      { type: "transcript", segments: [] },
      storageSession,
    );
    expect(logAction).toHaveBeenLastCalledWith({
      target: file,
      state: "error",
      message: "Error: failed",
    });
    const absent = session();
    await saveDocumentContent(file, content, absent.storageSession);
    expect(absent.api.upload).toHaveBeenCalled();
  });
});

describe("recursive removal", () => {
  it.each([undefined, "text", "transcript"])(
    "removes a file and its %s sidecar",
    async (readableContent) => {
      const sidecar =
        readableContent === "text"
          ? MDC_FILE_EXTENSION
          : TRANSCRIPT_FILE_EXTENSION;
      const { storageSession, api, logAction } = session({
        folder: [
          row("file.txt"),
          ...(readableContent ? [row("file.txt" + sidecar)] : []),
        ],
      });
      await remove(file.path, storageSession);
      expect(api.remove).toHaveBeenCalledWith([
        file.path,
        file.path + MDC_FILE_EXTENSION,
        file.path + TRANSCRIPT_FILE_EXTENSION,
      ]);
      expect(api.remove).toHaveBeenCalledTimes(1);
      expect(logAction).toHaveBeenLastCalledWith({
        state: "removed",
        target: { ...file, readableContent },
      });
    },
  );
  it("recursively removes folders and logs errors without claiming success", async () => {
    const { storageSession, api, logAction } = session({
      "": [row("folder", false)],
      folder: [row("a"), row("nested", false)],
      "folder/nested": [row("b")],
    });
    await remove("folder", storageSession);
    expect(api.remove).toHaveBeenCalledTimes(2);
    expect(logAction).toHaveBeenLastCalledWith({
      state: "removed",
      target: { folder: true, name: "folder", path: "folder" },
    });
    api.remove.mockResolvedValue({ error: { message: "permission" } });
    await expect(remove("folder/a", storageSession)).rejects.toMatchObject({
      message: "permission",
    });
    expect(logAction.mock.lastCall![0]).toMatchObject({
      state: "error",
      message: "permission",
    });
    logAction.mockClear();
    await remove("missing", storageSession);
    expect(logAction).not.toHaveBeenCalled();
  });
});
