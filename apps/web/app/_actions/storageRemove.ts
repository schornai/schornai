"use server";

import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { safeRedirectPath } from "@/lib/safeRedirectPath";
import { redirect } from "next/navigation";
import { remove } from "@schornio/aibox-package-database/storage/remove";
import { serverActionClient } from "@/lib/serverActionClient";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { z } from "zod/mini";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import {
  requireIdleFile,
  withStorageFileOperation,
} from "@/lib/storageFileOperations";
import { revalidatePath } from "next/cache";

export const storageRemove = serverActionClient
  .inputSchema(
    z.object({
      path: z.string(),
      redirectToParent: z.optional(z.object({ basePathApp: z.string() })),
      storage: storageSchema,
    }),
  )
  .action(async ({ parsedInput: { path, redirectToParent, storage } }) => {
    path = validateStoragePath(path);
    const supabase = await createSupabaseServerClient();
    await withStorageFileOperation(
      storage,
      path,
      supabase,
      async ({ session, queue }) => {
        await remove(path, session, {
          supabase,
          beforeRemove: (filePath) => requireIdleFile(queue, storage, filePath),
        });
      },
    );
    revalidatePath("/", "layout");

    if (redirectToParent) {
      const parent = path.split("/").slice(0, -1).join("/");
      redirect(safeRedirectPath(`${redirectToParent.basePathApp}/${parent}`));
    }
  });
