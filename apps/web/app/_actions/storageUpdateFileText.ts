"use server";
import { z } from "zod/mini";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import { updateFileText } from "@schornio/aibox-package-database/storage/updateFileText";
import {
  withStorageFileOperation,
  requireIdleFile,
  queueFileProcessing,
} from "@/lib/storageFileOperations";

export const storageUpdateFileText = serverActionClient
  .inputSchema(
    z.object({
      storage: storageSchema,
      path: z.string(),
      text: z.string().check(z.maxLength(1024 * 1024)),
      expectedText: z.string().check(z.maxLength(1024 * 1024)),
    }),
  )
  .action(async ({ parsedInput: { storage, ...input } }) => {
    input.path = validateStoragePath(input.path);
    const supabase = await createSupabaseServerClient();
    return withStorageFileOperation(
      storage,
      input.path,
      supabase,
      async ({ session, queue }) => {
        requireIdleFile(queue, storage, input.path);
        const result = await updateFileText(input, { session });
        if (result.status === "conflict") return result;
        let indexQueued = true;
        if (storage.type === "documentRepository") {
          try {
            await queueFileProcessing(result.file, {
              session,
              queue,
              supabase,
              useSavedContent: true,
            });
          } catch {
            indexQueued = false;
          }
        }
        revalidatePath("/", "layout");
        return { ...result, indexQueued };
      },
      { lock: true },
    );
  });
