"use server";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { prepareStorageWrite } from "@/lib/storageFileOperations";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import {
  selectChatFile,
  selectChatFileSchema,
} from "@schornio/aibox-realtime/documents/storage/selectChatFile";
export const storageSelectChatFile = serverActionClient
  .inputSchema(selectChatFileSchema)
  .action(async ({ parsedInput: input }) => {
    const supabase = await createSupabaseServerClient();
    await prepareStorageWrite(
      {
        type: "activity",
        agentId: input.agentId,
        activityId: input.activityId,
      },
      supabase,
    );
    const result = await selectChatFile(input, {
      supabase,
      serverToken: getRealtimeServerToken(),
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    });
    revalidatePath("/", "layout");
    return result;
  });
