"use server";
import { z } from "zod/mini";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import { inspect } from "@schornio/aibox-package-database/storage/inspect";
import { rename } from "@schornio/aibox-package-database/storage/rename";
import { remove } from "@schornio/aibox-package-database/storage/remove";
import { removeFileIndex } from "@schornio/aibox-package-database/storage/fileIndex";
import {
  queueFileProcessing,
  requireIdleFile,
  withStorageFileOperation,
} from "@/lib/storageFileOperations";
import { revalidatePath } from "next/cache";

export const storageFileAction = serverActionClient
  .inputSchema(
    z.object({
      storage: storageSchema,
      path: z.string(),
      action: z.enum(["rename", "delete", "process"]),
      newName: z.optional(z.string()),
    }),
  )
  .action(async ({ parsedInput: input }) => {
    const path = validateStoragePath(input.path);
    const supabase = await createSupabaseServerClient();
    return withStorageFileOperation(
      input.storage,
      path,
      supabase,
      async ({ session, queue }) => {
        const target = await inspect(path, session);
        if (!target?.file) throw new Error("FILE_NOT_FOUND");
        if (input.action === "process")
          return {
            processing: await queueFileProcessing(target, {
              session,
              queue,
              supabase,
            }),
          };
        requireIdleFile(queue, input.storage, path);
        if (input.action === "rename") {
          const file = await rename(
            { path, storageSession: session, supabase },
            input.newName ?? "",
          );
          revalidatePath("/", "layout");
          return { file };
        }
        await removeFileIndex(path, session, supabase);
        await remove(path, session);
        revalidatePath("/", "layout");
        return { deleted: true };
      },
      { lock: input.action !== "process" },
    );
  });
