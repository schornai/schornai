import { transferPathSchema } from "@schornio/aibox-package-database/xrag/transferSchema";
import type { XRAGResource } from "xrag/schema";

const downloadPath = "/api/xrag/download";
const signedObjectPath = "/storage/v1/object/sign/";

/** Only forward the Storage-issued capability for an XRAG export. The public
 * app and the server's Storage endpoint may be on different networks. */
export function xragFileDownloadUrl(signedUrl: string) {
  const url = new URL(signedUrl);
  const start = url.pathname.lastIndexOf(signedObjectPath);
  const token = url.searchParams.get("token");
  if (start < 0 || !token) throw new Error("XRAG_EXPORT_FAILED");
  const path = url.pathname.slice(start + signedObjectPath.length);
  return `${downloadPath}/${path}?${new URLSearchParams({ token })}`;
}

export function signedExportSource(
  parts: string[],
  token: string | null,
  storageUrl: string,
) {
  const [bucket, ...path] = parts;
  if (
    (bucket !== "xrag-exports" && bucket !== "xrag-transfers") ||
    path.length !== 3 ||
    !token
  )
    throw new Error("XRAG_EXPORT_FAILED");
  transferPathSchema.parse(path.join("/"));
  return {
    name: path[2]!,
    url: `${storageUrl.replace(/\/+$/, "")}${signedObjectPath}${parts.map(encodeURIComponent).join("/")}?${new URLSearchParams({ token })}`,
  };
}

export function xragModelDownloadUrl(modelId: string, digest: string) {
  return `${downloadPath}/model/${encodeURIComponent(modelId)}/${digest}`;
}

export function xragResourceDownloadUrl(
  kind: XRAGResource["resourceType"],
  id: string,
) {
  return `${downloadPath}/resource/${kind}/${encodeURIComponent(id)}`;
}
