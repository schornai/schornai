import { expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import {
  artifactObject,
  removeArtifactObject,
} from "../packages/database/src/xrag/artifactObject.ts";
import { getArtifactDownloadUrl } from "../packages/database/src/xrag/getArtifactDownloadUrl.ts";

it.each(["xrag-transfers", "xrag-prepared"])(
  "serves the original in %s and releases its pin on withdrawal",
  async (bucket) => {
    const path = "owner/upload/model.tar";
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.test/file" },
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const release = query({ error: null });
    const db = {
      from: vi.fn(() => release),
      storage: { from: vi.fn(() => ({ createSignedUrl, remove })) },
    } as any;
    const ref = `imported/${bucket}/${path}`;
    expect(await getArtifactDownloadUrl(ref, { supabase: db })).toBe(
      "https://storage.test/file",
    );
    expect(db.storage.from).toHaveBeenCalledWith(bucket);
    expect(createSignedUrl).toHaveBeenCalledWith(path, 3600);
    await removeArtifactObject(ref, db);
    expect(release.update).toHaveBeenCalledWith({ retained_object_id: null });
    expect(release.eq).toHaveBeenCalledWith("upload_path", ref);
    expect(remove).toHaveBeenCalledWith([path]);
    db.from.mockReturnValue(query({ error: new Error("offline") }));
    await expect(removeArtifactObject(ref, db)).rejects.toThrow(
      "XRAG_ARTIFACT_RELEASE_FAILED",
    );
    expect(remove).toHaveBeenCalledTimes(1);
  },
);
it("resolves legacy archive paths and rejects unrecognized reference buckets", () => {
  expect(artifactObject("uploads/old/model.tar")).toEqual({
    bucket: "box-action-files",
    path: "uploads/old/model.tar",
  });
  expect(() => artifactObject("imported/database_files/file")).toThrow(
    "XRAG_INVALID_ARTIFACT_SOURCE",
  );
});
