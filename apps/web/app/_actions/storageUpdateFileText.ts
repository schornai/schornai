"use server";
import { z } from "zod/mini";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { storageSchema } from "@schornio/aibox-package-database/storage/_schemas";
import { validateStoragePath } from "@schornio/aibox-package-database/storage/validatePath";
import { writeStorageFileText } from "@schornio/aibox-realtime/documents/storage/writeStorageFileText";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";

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
    const result = await writeStorageFileText(
      { storage, ...input },
      {
        supabase,
        serverToken: getRealtimeServerToken(),
        websocketProvider: new ServerRealtimeWebsocketProvider(),
      },
    );
    if (result.status !== "saved") return result;
    revalidatePath("/", "layout");
    return { status: result.status, indexQueued: result.indexQueued };
  });
