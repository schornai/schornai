"use server";
import { serverActionClient } from "@/lib/serverActionClient";
import { getXRAGContext } from "@/lib/xrag/getXRAGContext";
import { revalidatePath } from "next/cache";
import {
  setResourceIdentity as setIdentity,
  setResourceIdentitySchema,
} from "@schornio/aibox-package-database/xrag/setResourceIdentity";
export const setResourceIdentity = serverActionClient
  .inputSchema(setResourceIdentitySchema)
  .action(async ({ parsedInput }) => {
    const result = await setIdentity(
      parsedInput,
      await getXRAGContext({ selection: parsedInput }),
    );
    revalidatePath("/", "layout");
    return result;
  });
