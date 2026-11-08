// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import {
  resumeUpload,
  uploadFingerprint,
  uploadResumeUser,
} from "../../apps/web/lib/resumeUpload";
import type { Upload } from "tus-js-client";
const file = new File(["payload"], "component.xrag.tar", { lastModified: 123 });
const path = "uploads/12345678-1234-1234-1234-123456789abc/component.xrag.tar";
function fixture(overrides = {}) {
  const previous = {
    size: file.size,
    metadata: { bucketName: "box-action-files", objectName: path },
    creationTime: new Date().toISOString(),
    uploadUrl: "/api/storage/upload/resumable/id",
    ...overrides,
  };
  const upload = {
    options: { metadata: { objectName: "new-path" } },
    findPreviousUploads: vi.fn(async () => [previous]),
    resumeFromPreviousUpload: vi.fn(),
  };
  return upload;
}
it("resumes the original destination after reload", async () => {
  const upload = fixture();
  expect(
    await resumeUpload(upload as unknown as Upload, "box-action-files", file),
  ).toBe(path);
  expect(upload.options.metadata.objectName).toBe(path);
  expect(upload.resumeFromPreviousUpload).toHaveBeenCalledOnce();
});
it.each([
  { creationTime: new Date(Date.now() - 25 * 3600000).toISOString() },
  { size: 1 },
  { uploadUrl: "https://other.example/api/storage/upload/resumable/id" },
  { metadata: { bucketName: "files", objectName: path } },
  {
    metadata: {
      bucketName: "box-action-files",
      objectName: "uploads/12345678-1234-1234-1234-123456789abc/../other",
    },
  },
])(
  "does not resume expired, foreign or mismatched records: %j",
  async (overrides) => {
    const upload = fixture(overrides);
    expect(
      await resumeUpload(upload as unknown as Upload, "box-action-files", file),
    ).toBeUndefined();
    expect(upload.resumeFromPreviousUpload).not.toHaveBeenCalled();
  },
);
it("isolates fingerprints by user without persisting tokens", () => {
  const token = `header.${btoa(JSON.stringify({ sub: "user-a", secret: "not stored" }))}.signature`;
  expect(uploadResumeUser(token)).toBe("user-a");
  expect(uploadResumeUser("broken")).toBeUndefined();
  expect(uploadFingerprint("user-a", "box-action-files", file)).not.toBe(
    uploadFingerprint("user-b", "box-action-files", file),
  );
  expect(
    uploadFingerprint(uploadResumeUser(token)!, "box-action-files", file),
  ).not.toContain("secret");
});
