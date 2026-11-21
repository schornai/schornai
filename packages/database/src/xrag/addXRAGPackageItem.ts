import { getXRAGRelatedObjects } from "./getXRAGRelatedObjects.ts";
import { z } from "zod";
import { addXRAGPackageItemSchema } from "./packageSchema.ts";
import { getAuthorizedResource } from "./getAuthorizedResource.ts";
import { getXRAGPackageModel } from "./getXRAGPackageModel.ts";
import { listXRAGPackages } from "./listXRAGPackages.ts";
import type { XRAGOptions } from "./authentication.ts";
export async function addXRAGPackageItem(
  input: z.infer<typeof addXRAGPackageItemSchema>,
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  const {
    packageId,
    selection,
    related = [],
  } = addXRAGPackageItemSchema.parse(input);
  const packages = await listXRAGPackages(options);
  const xragPackage = packages.find((b) => b.id === packageId);
  if (!xragPackage) throw new Error("NOT_AUTHORIZED");
  const object =
    selection.kind === "model"
      ? await getXRAGPackageModel(selection.id, options)
      : await getAuthorizedResource(selection.kind, selection.id, options);
  const objects = new Map([
    [`${selection.kind}:${selection.id}`, { ...selection, name: object.name }],
  ]);
  if (related.length) {
    const available = await getXRAGRelatedObjects(selection, options);
    for (const selected of related) {
      const found = available.find(
        (candidate) =>
          candidate.kind === selected.kind && candidate.id === selected.id,
      );
      if (!found) throw new Error("XRAG_REFERENCE_UNAVAILABLE");
      objects.set(`${found.kind}:${found.id}`, found);
    }
  }
  // One upsert statement: either every explicitly selected object is added or none.
  const { error } = await options.supabase.from("xrag_package_items").upsert(
    [...objects.values()].map((selected) => ({
      package_id: packageId,
      kind: selected.kind,
      resource_id: selected.id,
      name: selected.name,
    })),
    { onConflict: "package_id,kind,resource_id" },
  );
  if (error) throw new Error("XRAG_PACKAGE_ADD_FAILED");
}
