"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { z } from "zod/mini";
import { revalidatePath } from "next/cache";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { transferStorageFile } from "@schornio/aibox-realtime/documents/storage/transferStorageFile";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
export const storageTransferFile = serverActionClient
  .inputSchema(
    z.object({
      from: z.object({ storage: storageSchema, path: z.string() }),
      to: z.object({ storage: storageSchema, folder: z.string() }),
      move: z.boolean(),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const result = await transferStorageFile(parsedInput, {
        supabase: await createSupabaseServerClient(),
        serverToken: getRealtimeServerToken(),
        websocketProvider: new ServerRealtimeWebsocketProvider(),
      });
      revalidatePath("/", "layout");
      return { result };
    } catch (error) {
      const allowed = [
        "FILE_ALREADY_EXISTS",
        "SOURCE_EQUALS_TARGET",
        "SOURCE_CHANGED_DURING_COPY",
        "FILE_PROCESSING_IN_PROGRESS",
        "STORAGE_NOT_AUTHORIZED",
        "COPIED_SOURCE_DELETE_FAILED",
        "COPY_FAILED_TARGET_CLEANUP_REQUIRED",
        "TARGET_FOLDER_NOT_FOUND",
      ];
      return {
        error:
          error instanceof Error && allowed.includes(error.message)
            ? error.message
            : "TRANSFER_FAILED",
      };
    }
  });
