"use server";
import { z } from "zod/mini";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createTextFile } from "@schornio/aibox-package-database/storage/createTextFile";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import {
  prepareStorageWrite,
  withStorageFileOperation,
} from "@/lib/storageFileOperations";
import { revalidatePath } from "next/cache";
import {
  validateFileName,
  validateStoragePath,
} from "@schornio/aibox-package-database/storage/validatePath";

export const storageCreateTextFile = serverActionClient
  .inputSchema(
    z.object({
      storage: storageSchema,
      basePath: z.string(),
      name: z.string(),
    }),
  )
  .action(async ({ parsedInput: { storage, ...input } }) => {
    const path = [
      validateStoragePath(input.basePath, { allowRoot: true }),
      validateFileName(input.name),
    ]
      .filter(Boolean)
      .join("/");
    const supabase = await createSupabaseServerClient();
    await prepareStorageWrite(storage, supabase);
    return withStorageFileOperation(
      storage,
      path,
      supabase,
      async ({ session }) => {
        const file = await createTextFile({ ...input, content: "" }, session);
        revalidatePath("/", "layout");
        return { file };
      },
    );
  });
