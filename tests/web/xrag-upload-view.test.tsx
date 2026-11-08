// @vitest-environment jsdom
import "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import XRAGUpload from "../../apps/web/app/(settings)/settings/xrag/_components/XRAGUpload";
const upload = vi.hoisted(() => ({
  publications: [],
  uploads: [] as any[],
  queueFileUploadsByFileList: vi.fn(),
  clearFinished: vi.fn(),
  isPending: false,
  hasErrored: false,
  hasSucceeded: false,
}));
vi.mock("../../apps/web/app/_components/FileUploadProvider", () => ({
  useFileUpload: () => upload,
}));
vi.mock(
  "../../apps/web/app/(settings)/settings/xrag/_components/XRAGUploadProvider",
  () => ({ useXRAGUpload: () => upload }),
);
vi.mock("../../apps/web/app/_components/StorageViewUpload", () => ({
  StorageViewUpload: () => <span>Uploading</span>,
}));
afterEach(cleanup);
it.each([true, false])(
  "renders archive upload results and active progress pending=%s",
  (pending) => {
    upload.isPending = pending;
    upload.uploads = [
      { id: "success", state: "success", file: { name: "success.tar" } },
      { id: "error", state: "error", file: { name: "failed.tar" } },
      { id: "queued", state: "queued", file: { name: "queued.tar" } },
    ];
    const view = render(<XRAGUpload />);
    expect(screen.getByText("successUpload")).toBeTruthy();
    expect(screen.getByText("errorUpload")).toBeTruthy();
    expect(!!screen.queryByText("Uploading")).toBe(pending);
    const files = [new File(["archive"], "archive.tar")];
    fireEvent.change(view.container.querySelector("input[type=file]")!, {
      target: { files },
    });
    expect(upload.queueFileUploadsByFileList).toHaveBeenCalledWith(files);
    fireEvent.click(screen.getByRole("button", { name: "buttonHide" }));
    expect(upload.clearFinished).toHaveBeenCalled();
  },
);
it("shows a fresh upload page without finished results", () => {
  upload.uploads = [];
  upload.isPending = false;
  render(<XRAGUpload />);
  expect(screen.queryByRole("button", { name: "buttonHide" })).toBeNull();
});
