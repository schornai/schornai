import { z } from "zod";
import { packageIdSchema } from "./packageSchema.ts";
import { getXRAGUserId, type XRAGOptions } from "./authentication.ts";
import { listXRAGPackages } from "./listXRAGPackages.ts";
export async function deleteXRAGPackage(
  input: z.infer<typeof packageIdSchema>,
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  const { packageId } = packageIdSchema.parse(input);
  if (!(await listXRAGPackages(options)).some((b) => b.id === packageId))
    throw new Error("NOT_AUTHORIZED");
  const { error } = await options.supabase
    .from("xrag_packages")
    .delete()
    .eq("id", packageId)
    .eq("owner_id", await getXRAGUserId(options));
  if (error) throw new Error("XRAG_PACKAGE_DELETE_FAILED");
}
