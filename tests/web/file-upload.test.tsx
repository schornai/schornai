// @vitest-environment jsdom
import "./client-setup";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FileUploadProvider,
  useFileUpload,
} from "../../apps/web/app/_components/FileUploadProvider";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
const state = vi.hoisted(() => ({
  uploads: [] as any[],
  token: "session-token",
  previous: [] as any[],
}));
vi.mock("@/lib/supabase/use-session-token", () => ({
  useSessionToken: () => state.token,
}));
vi.mock("tus-js-client", () => ({
  Upload: class {
    file: any;
    options: any;
    started = false;
    constructor(file: any, options: any) {
      this.file = file;
      this.options = options;
      state.uploads.push(this);
    }
    findPreviousUploads() {
      return Promise.resolve(state.previous);
    }
    resumeFromPreviousUpload(previous: any) {
      this.options.resumed = previous;
    }
    start() {
      this.started = true;
    }
  },
}));
afterEach(cleanup);
beforeEach(() => {
  state.uploads = [];
  state.token = "session-token";
  state.previous = [];
  vi.mocked(logError).mockClear();
});
function mount(props: any = {}) {
  return renderHook(useFileUpload, {
    wrapper: ({ children }) => (
      <FileUploadProvider
        basePath="/folder"
        bucketPath="activity/id"
        bucketName="files"
        {...props}
      >
        {children}
      </FileUploadProvider>
    ),
  });
}
const file = (name = "hello.txt", type = "text/plain") =>
  new File(["hello"], name, { type });
async function queue(hook: ReturnType<typeof mount>, files: File[]) {
  act(() => hook.result.current.queueFileUploadsByFileList(files as any));
  await waitFor(() => expect(state.uploads.length).toBeGreaterThan(0));
}
const entry = (name: string, type = "") => ({
  name,
  fullPath: `/nested/${name}`,
  isFile: true,
  isDirectory: false,
  file: (resolve: any) => resolve(file(name, type)),
});
describe("resumable file uploads", () => {
  it("accepts recorded File objects and resolves after upload callbacks finish", async () => {
    const afterUpload = vi.fn();
    const hook = mount({ afterUpload });
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.queueFileUploadsByFiles([
        file("recording.webm", "audio/webm"),
      ]);
    });
    await waitFor(() => expect(state.uploads).toHaveLength(1));
    await act(async () => state.uploads[0].options.onSuccess());
    await expect(pending).resolves.toEqual([
      expect.objectContaining({
        state: "success",
        path: "folder/recording.webm",
      }),
    ]);
    expect(afterUpload).toHaveBeenCalledOnce();
  });
  it("requires its provider and ignores missing file lists", () => {
    expect(() => renderHook(useFileUpload)).toThrow(/outside provider/);
    const hook = mount();
    act(() => hook.result.current.queueFileUploadsByFileList(null));
    expect(state.uploads).toEqual([]);
    expect(hook.result.current.progress).toBe(0);
  });
  it("passes storage metadata and authorization, streams progress, then clears success", async () => {
    const beforeUpload = vi.fn();
    const afterUpload = vi.fn();
    const onFileUploadProgress = vi.fn();
    const onFileUploadSuccess = vi.fn();
    const hook = mount({
      beforeUpload,
      afterUpload,
      onFileUploadProgress,
      onFileUploadSuccess,
    });
    await queue(hook, [file()]);
    expect(beforeUpload).toHaveBeenCalledWith([
      expect.objectContaining({ path: "folder/hello.txt", state: "queued" }),
    ]);
    const upload = state.uploads[0];
    expect(upload.started).toBe(true);
    expect(upload.options).toMatchObject({
      endpoint: "/api/storage/upload/resumable",
      chunkSize: 6291456,
      headers: { authorization: "Bearer session-token", "x-upsert": "true" },
      metadata: {
        objectName: "activity/id/folder/hello.txt",
        bucketName: "files",
        contentType: "text/plain",
      },
    });
    const pendingUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(pendingUnload);
    expect(pendingUnload.defaultPrevented).toBe(true);
    act(() => upload.options.onProgress(3, 6));
    expect(hook.result.current.progress).toBe(0.5);
    expect(onFileUploadProgress).toHaveBeenCalledWith(
      expect.objectContaining({ progress: 0.5, state: "uploading" }),
    );
    await act(async () => upload.options.onSuccess());
    expect(hook.result.current.progress).toBe(1);
    expect(onFileUploadSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ state: "success" }),
    );
    expect(afterUpload).toHaveBeenCalledWith(
      [expect.objectContaining({ state: "success" })],
      expect.objectContaining({
        clearErrors: expect.any(Function),
        clearFinished: expect.any(Function),
      }),
    );
    const finishedUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(finishedUnload);
    expect(finishedUnload.defaultPrevented).toBe(false);
    act(() => hook.result.current.clearFinished());
    expect(hook.result.current.uploads).toEqual([]);
  });
  it("uploads sequentially, preserves failures and averages total progress", async () => {
    const onFileUploadError = vi.fn();
    const afterUpload = vi.fn();
    const hook = mount({ onFileUploadError, afterUpload });
    await queue(hook, [file("a"), file("b", "")]);
    expect(state.uploads).toHaveLength(1);
    act(() => state.uploads[0].options.onProgress(1, 2));
    expect(hook.result.current.progress).toBe(0.25);
    await act(async () =>
      state.uploads[0].options.onError(new Error("network")),
    );
    expect(state.uploads).toHaveLength(2);
    expect(state.uploads[1].options.metadata.contentType).toBe(
      "application/octet-stream",
    );
    expect(onFileUploadError).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "error",
        errorMessage: "Error: network",
      }),
    );
    expect(logError).toHaveBeenCalledWith("FileUpload", expect.any(Error));
    await act(async () => state.uploads[1].options.onSuccess());
    expect(afterUpload).toHaveBeenCalledWith(
      [
        expect.objectContaining({ state: "error" }),
        expect.objectContaining({ state: "success" }),
      ],
      expect.any(Object),
    );
    act(() => hook.result.current.clearErrors());
    expect(hook.result.current.uploads.map((x) => x.state)).toEqual([
      "success",
    ]);
  });
  it("rejects restricted uploads before queuing and logs failed preflight", async () => {
    const restrictUpload = vi.fn(() => false);
    const hook = mount({ restrictUpload });
    const files = [file()];
    act(() => hook.result.current.queueFileUploadsByFileList(files as any));
    expect(restrictUpload).toHaveBeenCalledWith(files);
    expect(hook.result.current.uploads).toEqual([]);
    const failure = new Error("preflight");
    const failed = mount({
      beforeUpload: async () => {
        throw failure;
      },
    });
    act(() => failed.result.current.queueFileUploadsByFileList(files as any));
    await waitFor(() =>
      expect(logError).toHaveBeenCalledWith(
        "queueFileUploadsByFileList",
        failure,
      ),
    );
    expect(state.uploads).toEqual([]);
  });
  it("recurses dropped directories, excludes OS metadata and ignores null entries", async () => {
    const directory = {
      isFile: false,
      isDirectory: true,
      createReader: () => ({
        readEntries: (resolve: any) =>
          resolve([
            entry("hello.txt"),
            entry(".DS_Store"),
            entry("Thumbs.db"),
            entry("desktop.ini"),
          ]),
      }),
    };
    const hook = mount();
    await act(async () =>
      hook.result.current.queueFileUploadsByDataTransfer({
        items: [
          { webkitGetAsEntry: () => null },
          { webkitGetAsEntry: () => directory },
        ],
      } as any),
    );
    await waitFor(() => expect(state.uploads).toHaveLength(1));
    expect(hook.result.current.uploads[0].path).toBe("folder/nested/hello.txt");
    await act(async () => state.uploads[0].options.onSuccess());
    expect(hook.result.current.uploads[0].state).toBe("success");
  });
  it.each(["file", "directory"])(
    "reports dropped %s read errors",
    async (kind) => {
      const failure = new Error("read failed");
      const broken =
        kind === "file"
          ? { ...entry("bad"), file: (_: any, reject: any) => reject(failure) }
          : {
              isDirectory: true,
              isFile: false,
              createReader: () => ({
                readEntries: (_: any, reject: any) => reject(failure),
              }),
            };
      const hook = mount();
      await act(async () =>
        hook.result.current.queueFileUploadsByDataTransfer({
          items: [{ webkitGetAsEntry: () => broken }],
        } as any),
      );
      expect(logError).toHaveBeenCalledWith(
        "fileSystemEntriesToFileUploads",
        failure,
      );
      expect(state.uploads).toEqual([]);
    },
  );
});

it("resumes immutable XRAG uploads after remount and reports their original object path", async () => {
  state.token = `header.${btoa(JSON.stringify({ sub: "admin" }))}.signature`;
  const originalPath = "uploads/12345678-1234-1234-1234-123456789abc/model.tar";
  const payload = file("model.tar");
  state.previous = [
    {
      size: payload.size,
      creationTime: new Date().toISOString(),
      metadata: { bucketName: "box-action-files", objectName: originalPath },
      uploadUrl: "/api/storage/upload/resumable/resumed",
    },
  ];
  const success = vi.fn();
  const hook = mount({
    resumable: true,
    upsert: false,
    bucketName: "box-action-files",
    onFileUploadSuccess: success,
  });
  await queue(hook, [payload]);
  await waitFor(() => expect(state.uploads[0].started).toBe(true));
  expect(state.uploads[0].options.resumed).toBe(state.previous[0]);
  expect(state.uploads[0].options.headers["x-upsert"]).toBe("false");
  await act(async () => state.uploads[0].options.onSuccess());
  expect(success).toHaveBeenCalledWith(
    expect.objectContaining({ objectName: originalPath }),
  );
});
it("uses the refreshed session token for later chunks of a long upload", async () => {
  const hook = mount();
  await queue(hook, [file()]);
  state.token = "renewed-session";
  hook.rerender();
  const request = { setHeader: vi.fn() };
  state.uploads[0].options.onBeforeRequest(request);
  expect(request.setHeader).toHaveBeenCalledWith(
    "authorization",
    "Bearer renewed-session",
  );
});
it("allocates a fresh immutable destination for a second upload of the same filename", async () => {
  let sequence = 0;
  const hook = mount({
    upsert: false,
    bucketPath: () => `uploads/attempt-${++sequence}`,
  });
  await queue(hook, [file()]);
  await act(async () => state.uploads[0].options.onSuccess());
  act(() => {
    void hook.result.current.queueFileUploadsByFiles([file()]);
  });
  await waitFor(() => expect(state.uploads).toHaveLength(2));
  expect(
    state.uploads.map((upload) => upload.options.metadata.objectName),
  ).toEqual([
    "uploads/attempt-1/folder/hello.txt",
    "uploads/attempt-2/folder/hello.txt",
  ]);
  await act(async () => state.uploads[1].options.onSuccess());
});
