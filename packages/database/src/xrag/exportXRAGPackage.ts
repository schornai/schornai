import { identifierFromTitle } from "xrag/identifier";
import { packageIdSchema, packageObjectSchema } from "./packageSchema.ts";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { getAuthorizedResource } from "./getAuthorizedResource.ts";
import { getModelExportSource } from "./getModelExportSource.ts";

/** Queue a snapshot of the selection, not credentials or payloads. */
export async function exportXRAGPackage(
  input: { packageId: string },
  options: XRAGOptions,
) {
  const { packageId } = packageIdSchema.parse(input);
  const claims = await getXRAGClaims(options);
  requirePlatformAccess(claims, "admin", "workspace");
  const userId = await getXRAGUserId(options);
  const { data: xragPackage, error } = await options.supabase
    .from("xrag_packages")
    .select("name")
    .eq("id", packageId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error("XRAG_PACKAGE_READ_FAILED");
  if (!xragPackage) throw new Error("NOT_AUTHORIZED");
  // PostgREST can cap the returned rows below the actual selection size.
  const items = await options.supabase
    .from("xrag_package_items")
    .select("kind,resource_id", { count: "exact" })
    .eq("package_id", packageId);
  if (items.error) throw new Error("XRAG_PACKAGE_READ_FAILED");
  if (!items.count || items.count > 1000 || items.count !== items.data.length)
    throw new Error("XRAG_PACKAGE_SIZE");
  const selections = items.data.map((item) =>
    packageObjectSchema.parse({
      kind: item.kind,
      id: item.resource_id,
    }),
  );
  for (const selection of selections) {
    if (selection.kind === "model")
      await getModelExportSource(selection.id, options);
    else await getAuthorizedResource(selection.kind, selection.id, options);
  }
  const jobs = options.supabaseServiceRole.from("xrag_export_jobs");
  const active = await jobs
    .select("id")
    .eq("user_id", userId)
    .eq("package_id", packageId)
    .in("state", ["queued", "processing"])
    .maybeSingle();
  if (active.error) throw new Error("XRAG_EXPORT_FAILED");
  if (active.data) return { jobId: active.data.id };
  const result = await jobs
    .insert({
      user_id: userId,
      package_id: packageId,
      name: `${identifierFromTitle(xragPackage.name)}.xrag.tar`,
      selections,
      claims,
    })
    .select("id")
    .single();
  if (result.error?.code === "23505") {
    const winner = await jobs
      .select("id")
      .eq("user_id", userId)
      .eq("package_id", packageId)
      .in("state", ["queued", "processing"])
      .single();
    if (winner.data) return { jobId: winner.data.id };
  }
  if (result.error || !result.data) throw new Error("XRAG_EXPORT_FAILED");
  return { jobId: result.data.id };
}
