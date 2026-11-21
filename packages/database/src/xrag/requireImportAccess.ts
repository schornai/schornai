import { xragSchema } from "xrag/schema";
import { parseResource } from "./resource.ts";
import type { UserClaims } from "../auth/_types.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";

/** Claims must come from verified authentication, never from uploaded metadata.
 * Call on ALL flattened entries before staging files or mutating any resource. */
export function requireImportAccess(
  entries: readonly unknown[],
  target: { workspaceId: string } | { newWorkspace: true } | undefined,
  claims: UserClaims,
) {
  const parsed = requireXRAGArchiveAccess(entries, claims);
  if (target && "newWorkspace" in target) {
    requirePlatformAccess(claims, "admin", "admin");
  } else if (parsed.some((entry) => entry.xrag_type === "resource")) {
    if (!target) throw new Error("XRAG_WORKSPACE_REQUIRED");
    if (!target.workspaceId) throw new Error("NOT_AUTHORIZED");
    requirePlatformAccess(claims, "admin", "workspace", target.workspaceId);
  }
  return parsed;
}

/** Check the complete package before allowing selection, so deselection cannot
 * bypass the all-or-nothing access rule for restricted package contents. */
export function requireXRAGArchiveAccess(
  entries: readonly unknown[],
  claims: UserClaims,
) {
  requirePlatformAccess(claims, "admin", "workspace");
  if (!entries.length || entries.length > 1000)
    throw new Error("XRAG_IMPORT_ENTRY_LIMIT");
  const parsed = entries.map((entry) => xragSchema.parse(entry));
  for (const entry of parsed) {
    if (entry.xrag_type === "collection")
      throw new Error("XRAG_UNEXPANDED_COLLECTION");
    if (entry.xrag_type !== "resource")
      requirePlatformAccess(claims, "admin", "admin");
    else parseResource(entry);
  }
  return parsed;
}
