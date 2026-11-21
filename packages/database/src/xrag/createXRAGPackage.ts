import { z } from "zod";
import {
  getXRAGClaims,
  getXRAGUserId,
  type XRAGOptions,
} from "./authentication.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
export const createXRAGPackageSchema = z.object({
  name: z.string().trim().min(1).max(200),
});
export async function createXRAGPackage(
  input: z.infer<typeof createXRAGPackageSchema>,
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  requirePlatformAccess(await getXRAGClaims(options), "admin", "workspace");
  const { data, error } = await options.supabase
    .from("xrag_packages")
    .insert({
      name: createXRAGPackageSchema.parse(input).name,
      owner_id: await getXRAGUserId(options),
    })
    .select("id")
    .single();
  if (error) throw new Error("XRAG_PACKAGE_CREATE_FAILED");
  return data;
}
