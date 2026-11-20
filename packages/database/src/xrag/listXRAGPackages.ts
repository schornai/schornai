import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
export async function listXRAGPackages(
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const { data, error } = await options.supabase
    .from("xrag_packages")
    .select("id,name,xrag_package_items(kind,resource_id,name)")
    .eq("owner_id", await getXRAGUserId(options))
    .order("created_at", { ascending: false });
  if (error) throw new Error("XRAG_PACKAGE_READ_FAILED");
  return data;
}
