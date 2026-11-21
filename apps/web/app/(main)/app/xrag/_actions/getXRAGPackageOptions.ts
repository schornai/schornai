"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { packageObjectSchema } from "@schornio/aibox-package-database/xrag/packageSchema";
import { listXRAGPackages } from "@schornio/aibox-package-database/xrag/listXRAGPackages";
import { getXRAGRelatedObjects } from "@schornio/aibox-package-database/xrag/getXRAGRelatedObjects";
export const getXRAGPackageOptions = serverActionClient
  .inputSchema(packageObjectSchema)
  .action(async ({ parsedInput }) => {
    const context = await getXRAGContext({ selection: parsedInput });
    const packages = await listXRAGPackages(context);
    return {
      packages: packages.map(({ id, name }) => ({ id, name })),
      related: packages.length
        ? await getXRAGRelatedObjects(parsedInput, context)
        : [],
    };
  });
