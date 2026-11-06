"use server";

import { revalidatePath } from "next/cache";
import { updateTranscriptionSegment } from "@schornio/aibox-package-database/storage/updateTranscriptionSegment";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import {
  storageSchema,
  transcriptionSegmentSchema,
} from "@schornio/aibox-package-database/storage/_schemas";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import {
  withStorageFileOperation,
  requireIdleFile,
} from "@/lib/storageFileOperations";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/mini";

export const storageUpdateTranscriptionSegment = serverActionClient
  .inputSchema(
    z.object({
      storage: storageSchema,
      path: z.string(),
      segmentIndex: z.number().check(z.int(), z.minimum(0)),
      expectedSegment: transcriptionSegmentSchema,
      text: z.nullable(z.string().check(z.maxLength(100000))),
      reviewed: z.boolean(),
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
        const result = await updateTranscriptionSegment(input, { session });
        if (result.status === "saved") revalidatePath("/", "layout");
        return result;
      },
      { lock: true },
    );
  });
