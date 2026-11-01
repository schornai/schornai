import { resolvePath } from "@schornio/aibox-package-utils/resolvePath";

const extensions: Record<string, string> = {
  "text/html": "html",
  "application/xhtml+xml": "xhtml",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/json": "json",
  "application/xml": "xml",
  "text/xml": "xml",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/tiff": "tiff",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/zip": "zip",
  "application/octet-stream": "bin",
};

export function webFetchFileName(
  url: URL,
  contentType: string,
  disposition?: string,
  requestedName?: string,
) {
  let name: string | undefined = requestedName;
  const encoded = disposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  try {
    if (!name && encoded) name = decodeURIComponent(encoded.trim());
  } catch {
    /* Use regular filename instead. */
  }
  name ||= disposition
    ?.match(/filename\s*=\s*(?:"([^"]*)"|([^;]*))/i)
    ?.slice(1)
    .find(Boolean)
    ?.trim();
  if (!name) {
    try {
      name = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
    } catch {
      name = "";
    }
  }
  // Only a basename: server-controlled filenames cannot select a storage path.
  name =
    name
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/[^\p{L}\p{N}._ -]/gu, "_")
      .replace(/^\.+/, "")
      .trim() || "download";
  name = name.slice(0, 160);
  const extension =
    contentType === "application/octet-stream" && name.includes(".")
      ? undefined
      : extensions[contentType];
  if (extension && !name.toLowerCase().endsWith(`.${extension}`))
    name += `.${extension}`;
  if (!name.includes(".")) name += ".bin";
  return name;
}

// Mirror the URL hierarchy. Routes without a filename become directories.
export function webFetchStoragePath(
  url: URL,
  contentType: string,
  disposition?: string,
) {
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        segment = decodeURIComponent(segment);
      } catch {
        /* Keep malformed escapes literal. */
      }
      return segment
        .replace(/[^\p{L}\p{N}._ -]/gu, "_")
        .replace(/^\.+/, "_")
        .slice(0, 160);
    });
  const last = segments.at(-1);
  const hasFilename = !url.pathname.endsWith("/") && !!last?.match(/\.[^./]+$/);
  const filenameUrl = new URL(url);
  filenameUrl.pathname = hasFilename ? `/${segments.pop()}` : "/index";
  const filename = webFetchFileName(filenameUrl, contentType, disposition);
  const host = url.hostname + (url.port ? `_${url.port}` : "");
  return resolvePath(["web", host, ...segments, filename].join("/"));
}
