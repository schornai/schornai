import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAssetUpload } from "../packages/database/src/storage/createAssetUpload";
import { uploadAsset } from "../packages/database/src/storage/uploadAsset";
import type { SupabaseClient } from "../packages/database/src/_shared/_types";

const sign = vi.fn();
const upload = vi.fn();
const from = vi.fn(() => ({
  createSignedUploadUrl: sign,
  uploadToSignedUrl: upload,
}));
const options = {
  supabase: { storage: { from } } as unknown as SupabaseClient,
};
beforeEach(() => {
  vi.clearAllMocks();
  sign.mockResolvedValue({
    data: { signedUrl: "https://storage.test/upload", token: "ticket" },
    error: null,
  });
  upload.mockResolvedValue({ error: null });
});
describe("authorized platform asset upload boundary", () => {
  it.each([
    "../logo.png",
    "/logo.png",
    "",
    ".hidden",
    "logo/name.png",
    "a".repeat(201),
  ])("rejects unsafe filename %s before requesting a ticket", async (name) => {
    await expect(
      createAssetUpload("theme_logos", "owner", name, options),
    ).rejects.toThrow("INVALID_FILE_NAME");
    expect(from).not.toHaveBeenCalled();
  });
  it.each(["user_avatars", "theme_logos", "box-action-files"] as const)(
    "uploads %s to a fresh path and returns its application reference",
    async (bucket) => {
      const bytes = new Uint8Array([1, 2, 3]);
      const first = await uploadAsset(
        bucket,
        "owner",
        "logo.png",
        bytes,
        "image/png",
        options,
      );
      const second = await createAssetUpload(
        bucket,
        "owner",
        "logo.png",
        options,
      );
      expect(first.path).not.toBe(second.path);
      expect(first.path).toMatch(
        bucket === "user_avatars"
          ? /^owner\/[^/]+-logo\.png$/
          : /^uploads\/[^/]+\/logo\.png$/,
      );
      expect(from).toHaveBeenCalledWith(bucket);
      expect(sign).toHaveBeenCalledWith(first.path, { upsert: false });
      expect(upload).toHaveBeenCalledWith(first.path, "ticket", bytes, {
        contentType: "image/png",
      });
      expect(first.reference).toBe(
        bucket === "user_avatars"
          ? `${bucket}/${first.path}`
          : bucket === "theme_logos"
            ? `/api/storage/theme_logos/${first.path}`
            : first.path,
      );
    },
  );
  it.each([
    { data: null, error: null },
    { data: null, error: { message: "private backend detail" } },
  ])("sanitizes failed ticket requests", async (result) => {
    sign.mockResolvedValue(result);
    await expect(
      uploadAsset(
        "theme_logos",
        "owner",
        "logo.png",
        new Uint8Array(),
        "image/png",
        options,
      ),
    ).rejects.toThrow("UPLOAD_URL_FAILED");
    expect(upload).not.toHaveBeenCalled();
  });
  it("does not expose an asset reference when the signed upload fails", async () => {
    upload.mockResolvedValue({ error: { message: "private detail" } });
    await expect(
      uploadAsset(
        "user_avatars",
        "owner",
        "logo.png",
        new Uint8Array(),
        "image/png",
        options,
      ),
    ).rejects.toThrow("ASSET_UPLOAD_FAILED");
  });
});
