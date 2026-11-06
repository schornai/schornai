import { beforeEach, expect, it, vi } from "vitest";
import { updateFileText } from "../packages/database/src/storage/updateFileText";
import { getDocumentBlob } from "../packages/database/src/storage/getDocumentBlob";
import { getDocumentContent } from "../packages/database/src/storage/getDocumentContent";
import { getFileTextBackup } from "../packages/database/src/storage/getFileTextBackup";
import { createFile } from "../packages/database/src/storage/createFile";
import { clearDocumentContent } from "../packages/database/src/storage/clearDocumentContent";
import { saveDocumentContent } from "../packages/database/src/storage/saveDocumentContent";
import { transferFile } from "../packages/database/src/storage/transferFile";
import { validateStoragePath } from "../packages/database/src/storage/validatePath";
import { list } from "../packages/database/src/storage/list";
import { StorageSession } from "../packages/database/src/storage/_utils/StorageSession";
import {
  MDC_FILE_EXTENSION,
  TEXT_WRITE_FILE_EXTENSION,
  TRANSCRIPT_FILE_EXTENSION,
} from "../packages/database/src/storage/_utils/toStorageObjectArray";
import { serializeMDC } from "../packages/markdown-changelog/src/serialize";

const prefix = "workspace/repo/";
const original = prefix + "notes.txt";
const sidecar = original + MDC_FILE_EXTENSION;
const journal = original + TEXT_WRITE_FILE_EXTENSION;
let blobs: Map<string, Blob>;
let fail: (operation: string, path: string) => "before" | "after" | undefined;
let controller: AbortController;
const logAction = vi.fn();
const events: string[] = [];
const api = {
  download: vi.fn(
    async (
      path: string,
      _options: unknown,
      { signal }: { signal: AbortSignal },
    ) => {
      signal.throwIfAborted();
      if (fail("download", path))
        return { error: new Error("download unavailable") };
      const data = blobs.get(path);
      return data
        ? { data, error: null }
        : { data: null, error: { statusCode: "404" } };
    },
  ),
  list: vi.fn(async (folder: string, { search }: { search?: string }) => {
    folder = folder.replace(/\/$/, "");
    return {
      data: [...blobs]
        .filter(
          ([path]) =>
            path.startsWith(folder + "/") &&
            !path.slice(folder.length + 1).includes("/"),
        )
        .map(([path, blob]) => ({
          name: path.slice(folder.length + 1),
          metadata: { size: blob.size, mimetype: blob.type },
        }))
        .filter((row) => !search || row.name.includes(search)),
      error: null,
    };
  }),
  upload: vi.fn(
    async (
      path: string,
      value: Blob | string,
      options: { upsert?: boolean },
    ) => {
      events.push("upload:" + path);
      const failure = fail("upload", path);
      if (failure === "before")
        return { error: new Error("upload unavailable") };
      if (!options.upsert && blobs.has(path))
        return { error: new Error("exists") };
      blobs.set(path, value instanceof Blob ? value : new Blob([value]));
      return {
        error: failure === "after" ? new Error("upload response lost") : null,
      };
    },
  ),
  update: vi.fn(async (path: string, value: Blob) => {
    events.push("update:" + path);
    const failure = fail("update", path);
    if (failure !== "before") blobs.set(path, value);
    return { error: failure ? new Error("update unavailable") : null };
  }),
  remove: vi.fn(async (paths: string[]) => {
    const failure = fail("remove", paths[0]!);
    events.push("remove:" + paths[0]);
    if (failure !== "before") paths.forEach((path) => blobs.delete(path));
    return { error: failure ? new Error("remove unavailable") : null };
  }),
  copy: vi.fn(),
};
const session = () =>
  Object.assign(
    new StorageSession({
      storage: {
        type: "documentRepository",
        workspaceId: "workspace",
        documentRepositoryId: "repo",
      },
      supabaseStorage: { from: () => api } as any,
      abortSignal: controller.signal,
    }),
    { logAction },
  );
const edit = (text = "after", expectedText = "before", path = "notes.txt") =>
  updateFileText({ path, text, expectedText }, { session: session() });
beforeEach(() => {
  vi.clearAllMocks();
  controller = new AbortController();
  events.length = 0;
  fail = () => undefined;
  blobs = new Map([
    [original, new Blob(["before"], { type: "text/plain" })],
    [sidecar, new Blob([serializeMDC({ current: "before", versions: [] })])],
  ]);
});
it("publishes the original and one history entry only after both writes commit", async () => {
  expect(await edit("Grüße 👋")).toMatchObject({ status: "saved" });
  expect(await blobs.get(original)!.text()).toBe("Grüße 👋");
  const content = await getDocumentContent("notes.txt", session());
  expect(content).toMatchObject({
    current: "Grüße 👋",
    versions: [expect.objectContaining({ version: 1 })],
  });
  expect(blobs.has(journal)).toBe(false);
  expect(events[0]).toBe("upload:" + journal);
  expect(events.at(-1)).toBe("remove:" + journal);
  expect(logAction).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      state: "created",
      content: expect.objectContaining({ current: "Grüße 👋" }),
    }),
  );
});
it.each([false, true])(
  "restores exact original and history after the second write fails (sidecar existed: %s)",
  async (hasSidecar) => {
    if (!hasSidecar) blobs.delete(sidecar);
    const before = new Map(blobs);
    fail = (operation) => (operation === "update" ? "before" : undefined);
    await expect(edit()).rejects.toThrow("update unavailable");
    for (const [path, blob] of before)
      expect(await blobs.get(path)!.text()).toBe(await blob.text());
    expect(blobs.has(sidecar)).toBe(hasSidecar);
    expect(blobs.has(journal)).toBe(false);
    expect(logAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ state: "created" }),
    );
    fail = () => undefined;
    expect(await edit()).toMatchObject({ status: "saved" });
  },
);
it("keeps backups readable and retries recovery before checking the expected text", async () => {
  fail = (operation, path) =>
    operation === "update"
      ? "after"
      : operation === "upload" && path === original
        ? "before"
        : undefined;
  expect(await edit()).toEqual({ status: "recoveryRequired" });
  expect(await blobs.get(original)!.text()).toBe("after");
  expect(blobs.has(journal)).toBe(true);
  expect(await (await getDocumentBlob("notes.txt", session()))!.text()).toBe(
    "before",
  );
  expect(await getDocumentContent("notes.txt", session())).toMatchObject({
    current: "before",
    versions: [],
  });
  expect(
    await (await getFileTextBackup(original, {
      storage: api as any,
      signal: controller.signal,
    }))!.blob!.text(),
  ).toBe("before");
  expect(logAction).not.toHaveBeenCalledWith(
    expect.objectContaining({ state: "created" }),
  );
  fail = () => undefined;
  expect(await edit()).toMatchObject({ status: "saved" });
  expect(await getDocumentContent("notes.txt", session())).toMatchObject({
    current: "after",
    versions: [expect.objectContaining({ version: 1 })],
  });
});
it("recovers after cancellation without writing after the lease signal is aborted", async () => {
  fail = (operation, path) => {
    if (operation === "upload" && path === sidecar) controller.abort();
    return undefined;
  };
  expect(await edit()).toEqual({ status: "recoveryRequired" });
  expect(api.update).not.toHaveBeenCalled();
  expect(blobs.has(journal)).toBe(true);
  fail = () => undefined;
  controller = new AbortController();
  expect(await edit()).toMatchObject({ status: "saved" });
});
it("recognizes a successful commit whose final response was lost", async () => {
  fail = (operation, path) =>
    operation === "remove" && path === journal ? "after" : undefined;
  expect(await edit()).toMatchObject({ status: "saved" });
  expect(await blobs.get(original)!.text()).toBe("after");
  expect(blobs.has(journal)).toBe(false);
});
it("does not modify data when the backup cannot be read or persisted", async () => {
  fail = (operation, path) =>
    operation === "download" && path === original ? "before" : undefined;
  await expect(edit()).rejects.toThrow("download unavailable");
  expect(events).toEqual([]);
  fail = (operation, path) =>
    operation === "upload" && path === journal ? "before" : undefined;
  await expect(edit()).rejects.toThrow("upload unavailable");
  expect(await blobs.get(original)!.text()).toBe("before");
  expect(api.update).not.toHaveBeenCalled();
});
it("leaves no changed sidecar when its write fails", async () => {
  fail = (operation, path) =>
    operation === "upload" && path === sidecar ? "before" : undefined;
  expect(await edit()).toEqual({ status: "recoveryRequired" });
  expect(api.update).not.toHaveBeenCalled();
  expect(await getDocumentContent("notes.txt", session())).toMatchObject({
    current: "before",
  });
  fail = () => undefined;
  expect(await edit()).toMatchObject({ status: "saved" });
});
it("rejects stale edits and oversized text without creating a backup", async () => {
  expect(await edit("mine", "stale")).toEqual({ status: "conflict" });
  await expect(edit("ü".repeat(1024 * 1024))).rejects.toThrow(
    "TEXT_FILE_TOO_LARGE",
  );
  expect(events).toEqual([]);
});
it("preserves binary originals and timed transcription when editing their extracted text", async () => {
  blobs.set(prefix + "report.pdf", new Blob(["binary"]));
  blobs.set(prefix + "report.pdf" + MDC_FILE_EXTENSION, new Blob(["before"]));
  expect(await edit("correction", "before", "report.pdf")).toMatchObject({
    status: "saved",
  });
  expect(await blobs.get(prefix + "report.pdf")!.text()).toBe("binary");
  blobs.set(prefix + "speech.wav", new Blob(["audio"]));
  blobs.set(
    prefix + "speech.wav" + TRANSCRIPT_FILE_EXTENSION,
    new Blob([
      JSON.stringify({
        segments: [
          {
            noSpeechProbability: 0,
            timeStart: 1,
            timeEnd: 2,
            words: [
              { probability: 1, timeStart: 1, timeEnd: 2, word: "Hello" },
            ],
          },
        ],
      }),
    ]),
  );
  expect(await edit("", "Hello", "speech.wav")).toMatchObject({
    status: "saved",
  });
  expect(await getDocumentContent("speech.wav", session())).toMatchObject({
    textOverride: "",
    segments: [expect.objectContaining({ timeStart: 1, timeEnd: 2 })],
  });
  expect(api.update).not.toHaveBeenCalled();
});
it("hides and reserves recovery files and rejects competing overwrites or copies", async () => {
  fail = (operation) =>
    operation === "update" || operation === "remove" ? "before" : undefined;
  expect(await edit()).toEqual({ status: "recoveryRequired" });
  fail = () => undefined;
  expect((await list("", session())).map((file) => file.name)).toEqual([
    "notes.txt",
  ]);
  expect(() =>
    validateStoragePath("notes.txt" + TEXT_WRITE_FILE_EXTENSION),
  ).toThrow("INVALID_FILE_PATH");
  await expect(
    createFile(new Blob(["replacement"]), "notes.txt", session()),
  ).rejects.toThrow("TEXT_WRITE_RECOVERY_REQUIRED");
  await expect(clearDocumentContent("notes.txt", session())).rejects.toThrow(
    "TEXT_WRITE_RECOVERY_REQUIRED",
  );
  expect(
    await saveDocumentContent(
      { file: true, path: "notes.txt" } as any,
      { type: "mdc", current: "replacement", versions: [] },
      session(),
    ),
  ).toBe(false);
  await expect(
    transferFile(
      { path: "notes.txt", storageSession: session() },
      { path: "copy.txt", storageSession: session() },
    ),
  ).rejects.toThrow("TEXT_WRITE_RECOVERY_REQUIRED");
  expect(api.copy).not.toHaveBeenCalled();
});
