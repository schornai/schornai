import { archiveWebStream } from "xrag/streamArchive";
import type { installedModelArchive } from "@schornio/aibox-package-database/xrag/installedModelArchive";
import { attachmentDisposition } from "../storageDownloadResponse";

export function installedModelDownload(
  request: Request,
  archive: Awaited<ReturnType<typeof installedModelArchive>>,
  name: string,
) {
  const { size, version } = archive;
  const etag = `"${version}"`;
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    ETag: etag,
    "Content-Type": "application/x-tar",
    "Content-Disposition": attachmentDisposition(name),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  let start = 0,
    end = size - 1;
  const range = request.headers.get("range");
  const validator = request.headers.get("if-range");
  const partial = range && (!validator || validator === etag);
  if (partial) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match?.[1]) {
      start = Number(match[1]);
      if (match[2]) end = Math.min(end, Number(match[2]));
    } else if (match?.[2]) start = Math.max(0, size - Number(match[2]));
    if (
      (!match?.[1] && !match?.[2]) ||
      !Number.isSafeInteger(start) ||
      start > end
    ) {
      headers.set("Content-Range", `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  headers.set("Content-Length", String(end - start + 1));
  const body = archiveWebStream(
    archive.read(start, end + 1, request.signal),
    request.signal,
  );
  return new Response(body, {
    headers,
    status: partial ? 206 : 200,
  });
}
