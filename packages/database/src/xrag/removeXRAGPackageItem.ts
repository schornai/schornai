import { z } from "zod";
import { packageItemSchema } from "./packageSchema.ts";
import { listXRAGPackages } from "./listXRAGPackages.ts";
import type { XRAGOptions } from "./authentication.ts";
export async function removeXRAGPackageItem(
  input: z.infer<typeof packageItemSchema>,
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  const { packageId, selection } = packageItemSchema.parse(input);
  if (!(await listXRAGPackages(options)).some((b) => b.id === packageId))
    throw new Error("NOT_AUTHORIZED");
  const { error } = await options.supabase
    .from("xrag_package_items")
    .delete()
    .eq("package_id", packageId)
    .eq("kind", selection.kind)
    .eq("resource_id", selection.id);
  if (error) throw new Error("XRAG_PACKAGE_REMOVE_FAILED");
}
