import { createHash } from "node:crypto";
import type { XRAGResource } from "./schema.ts";

type Kind = XRAGResource["resourceType"] | "model";

/** UUIDv8 with 122 bits from SHA-256. Structured names prevent ambiguous joins.
 * IDs identify logical objects; archive checksums identify particular contents. */
function identity(parts: string[]) {
  const bytes = createHash("sha256")
    .update(JSON.stringify(["schorn.ai/xrag/v2", ...parts]))
    .digest();
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Native database IDs are already randomly assigned. Models use their existing
 * globally shared identifier so the same model resolves across installations. */
export function nativeResourceId(kind: Kind, sourceId: string) {
  if (!sourceId) throw new Error("XRAG_INVALID_IDENTITY");
  return identity(["native", kind, sourceId]);
}

/** Predict references even when the referenced object is imported later.
 * A persisted origin mapping takes precedence when resolving an existing import. */
export function importedResourceId(
  workspaceId: string,
  kind: XRAGResource["resourceType"],
  originId: string,
) {
  if (!workspaceId || !originId) throw new Error("XRAG_INVALID_IDENTITY");
  return identity(["import", workspaceId, kind, originId]);
}
