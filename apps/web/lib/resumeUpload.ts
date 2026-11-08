import type { Upload } from "tus-js-client";

/** Only namespaces local records; authorization still uses the actual token.
 * Never persist session credentials in the fingerprint. */
export function uploadResumeUser(token: string | null | undefined) {
  try {
    const payload = JSON.parse(
      atob(token!.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload.sub === "string"
      ? (payload.sub as string)
      : undefined;
  } catch {
    return undefined;
  }
}
export function uploadFingerprint(user: string, bucket: string, file: File) {
  return JSON.stringify([
    "schornai-upload-v1",
    user,
    bucket,
    file.name,
    file.size,
    file.lastModified,
  ]);
}
/** Restore the original immutable destination. Limit local resume attempts to
 * 24 hours; the upload protocol handles an earlier server-side expiration. */
export async function resumeUpload(upload: Upload, bucket: string, file: File) {
  const previous = (await upload.findPreviousUploads()).find(
    (candidate) =>
      candidate.size === file.size &&
      candidate.metadata.bucketName === bucket &&
      /^uploads\/[0-9a-f-]{36}\/.+/.test(candidate.metadata.objectName ?? "") &&
      !candidate.metadata.objectName!.split("/").includes("..") &&
      Date.now() - Date.parse(candidate.creationTime) < 24 * 60 * 60 * 1000 &&
      Date.parse(candidate.creationTime) <= Date.now(),
  );
  if (!previous) return undefined;
  const url = new URL(previous.uploadUrl ?? "", window.location.origin);
  // Local resume records must never send a session token to another origin.
  if (
    url.origin !== window.location.origin ||
    !url.pathname.startsWith("/api/storage/upload/resumable/")
  )
    return undefined;
  upload.options.metadata = {
    ...upload.options.metadata,
    objectName: previous.metadata.objectName!,
  };
  upload.resumeFromPreviousUpload(previous);
  return previous.metadata.objectName;
}
