// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import { Doc } from "yjs";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageContext } from "../../apps/web/app/_components/StorageContext";
import {
  EditorAvatarUploadProvider,
  useEditorAvatarUpload,
} from "../../apps/web/app/(settings)/_components/EditorAvatarUploadProvider";
import XRAGUploadProvider, {
  useXRAGUpload,
} from "../../apps/web/app/(settings)/settings/xrag/_components/XRAGUploadProvider";
const mocks = vi.hoisted(() => ({
  document: undefined as any,
  upload: undefined as any,
  view: undefined as any,
  folders: vi.fn(),
  process: vi.fn(),
  before: vi.fn(),
}));
vi.mock("@/lib/RealtimeRoom", () => ({
  RealtimeRoom: ({ children }: any) => children,
}));
vi.mock("@hocuspocus/provider-react", () => ({
  HocuspocusRoom: ({ children }: any) => children,
  useHocuspocusProvider: () => ({ document: mocks.document }),
}));
vi.mock("../../apps/web/app/_components/FileUploadProvider", () => ({
  FileUploadProvider: (props: any) => {
    mocks.upload = props;
    return props.children;
  },
}));
vi.mock("../../apps/web/app/_components/StorageViewProvider", () => ({
  StorageViewProvider: (props: any) => {
    mocks.view = props;
    return (
      <div>{props.storageObjects.map((item: any) => item.path).join(",")}</div>
    );
  },
}));
vi.mock("../../apps/web/app/_components/FileUploadDropZone", () => ({
  FileUploadDropZone: ({ children }: any) => children,
}));
vi.mock("../../apps/web/app/_actions/storageCreateFolders", () => ({
  storageCreateFolders: mocks.folders,
}));
vi.mock("../../apps/web/app/_actions/storageQueueProcessFiles", () => ({
  storageQueueProcessFiles: mocks.process,
}));
vi.mock("../../apps/web/app/(settings)/_actions/updateProfileAvatar", () => ({
  updateProfileAvatar: vi.fn(),
}));
vi.mock(
  "../../apps/web/app/(settings)/settings/xrag/_actions/submitXRAG",
  () => ({ submitXRAG: vi.fn() }),
);
afterEach(cleanup);
beforeEach(() => {
  mocks.document = new Doc();
  mocks.folders.mockReset().mockResolvedValue({});
  mocks.process.mockReset().mockResolvedValue({});
  client.execute.mockReset();
  client.pending = false;
});
function AvatarState() {
  return <output>{JSON.stringify(useEditorAvatarUpload())}</output>;
}
function XRAGState() {
  return <output>{JSON.stringify(useXRAGUpload())}</output>;
}
function state() {
  return JSON.parse(screen.getByRole("status").textContent!);
}
const upload = {
  id: "upload",
  path: "folder/file.txt",
  state: "success",
  file: new File(["text"], "file.txt"),
  progress: 1,
};
describe("upload orchestration contexts", () => {
  it("creates distinct parent folders, logs uploads and queues only successful files", async () => {
    render(
      <StorageContext
        basePathApp="/files"
        basePathStorage="/"
        storage={{ type: "activity", agentId: "agent", activityId: "activity" }}
        storageObjects={[]}
        beforeUpload={mocks.before}
      />,
    );
    await act(async () =>
      mocks.upload.beforeUpload([
        upload,
        { ...upload, path: "folder/other.txt" },
      ]),
    );
    expect(mocks.before).toHaveBeenCalled();
    expect(mocks.folders).toHaveBeenCalledWith(
      expect.objectContaining({ folderNames: ["folder"] }),
    );
    act(() => {
      mocks.upload.onFileUploadProgress(upload);
      mocks.upload.onFileUploadSuccess(upload);
      mocks.upload.onFileUploadError({
        ...upload,
        state: "error",
        errorMessage: "failed",
      });
    });
    const clearFinished = vi.fn();
    await act(async () =>
      mocks.upload.afterUpload(
        [upload, { ...upload, state: "error", path: "failed.txt" }],
        { clearFinished },
      ),
    );
    expect(mocks.process).toHaveBeenCalledWith(
      expect.objectContaining({ filePaths: ["folder/file.txt"] }),
    );
    expect(clearFinished).not.toHaveBeenCalled();
    await act(async () =>
      mocks.upload.afterUpload([upload], { clearFinished }),
    );
    expect(clearFinished).toHaveBeenCalledOnce();
    mocks.process.mockRejectedValueOnce(new Error("queue unavailable"));
    await act(async () =>
      mocks.upload.afterUpload([upload], { clearFinished }),
    );
  });

  it("keeps uploaded files pending until processing finishes or is skipped", async () => {
    render(
      <StorageContext
        basePathApp="/files"
        basePathStorage="/"
        storage={{ type: "activity", agentId: "agent", activityId: "activity" }}
        storageObjects={[]}
        userPreferences={{}}
        id="test"
      />,
    );
    act(() => mocks.upload.onFileUploadSuccess(upload));
    expect(mocks.view.pendingFilePaths).toEqual(["folder/file.txt"]);
    await act(async () =>
      mocks.upload.afterUpload([upload], { clearFinished: vi.fn() }),
    );
    expect(mocks.view.pendingFilePaths).toEqual(["folder/file.txt"]);
    mocks.process.mockResolvedValueOnce({
      data: { skippedPaths: [upload.path] },
    });
    await act(async () =>
      mocks.upload.afterUpload([upload], { clearFinished: vi.fn() }),
    );
    expect(mocks.view.pendingFilePaths).toEqual([]);
    act(() => mocks.upload.onFileUploadSuccess(upload));
    mocks.process.mockResolvedValueOnce({ serverError: "Queue failed" });
    await act(async () =>
      mocks.upload.afterUpload([upload], { clearFinished: vi.fn() }),
    );
    expect(mocks.view.pendingFilePaths).toEqual([]);
  });
  it.each([undefined, "target"])(
    "restricts avatars to a single image and uploads for target %s",
    (targetUserId) => {
      render(
        <EditorAvatarUploadProvider userId="user" targetUserId={targetUserId}>
          <AvatarState />
        </EditorAvatarUploadProvider>,
      );
      expect(mocks.upload.bucketPath).toBe(targetUserId ?? "user");
      const image = new File(["image"], "image.png", { type: "image/png" });
      expect(mocks.upload.restrictUpload([image])).toBe(true);
      expect(mocks.upload.restrictUpload([])).toBe(false);
      expect(mocks.upload.restrictUpload([image, image])).toBe(false);
      expect(mocks.upload.restrictUpload([upload.file])).toBe(false);
      act(() => mocks.upload.beforeUpload());
      expect(state().isPending).toBe(true);
      act(() => mocks.upload.onFileUploadSuccess(upload));
      expect(client.execute).toHaveBeenCalledWith({
        avatarUrl: `user_avatars/${targetUserId ?? "user"}/${upload.path}`,
        targetUserId,
      });
      expect(state().isPending).toBe(false);
      act(() => mocks.upload.onFileUploadError(new Error("failed")));
      expect(state().hasErrored).toBe(true);
    },
  );
  it("reports XRAG upload progress and forwards the uploaded archive name", () => {
    render(
      <XRAGUploadProvider>
        <XRAGState />
      </XRAGUploadProvider>,
    );
    act(() => mocks.upload.beforeUpload());
    expect(state().isPending).toBe(true);
    act(() => mocks.upload.onFileUploadSuccess(upload));
    expect(mocks.upload.bucketPath).toMatch(/^uploads\/[0-9a-f-]{36}$/);
    expect(client.execute).toHaveBeenCalledWith({
      actionFileName: `${mocks.upload.bucketPath}/file.txt`,
    });
    expect(state().isPending).toBe(false);
    act(() => mocks.upload.onFileUploadError(new Error("failed")));
    expect(state().hasErrored).toBe(true);
  });
});
