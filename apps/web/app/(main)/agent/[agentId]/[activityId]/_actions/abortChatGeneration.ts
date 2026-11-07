"use server";
import { z } from "zod/mini";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { abortChatGeneration as abortChatGenerationShared } from "@schornio/aibox-realtime/documents/chat/abortChatGeneration";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { serverActionClient } from "@/lib/serverActionClient";
export const abortChatGeneration = serverActionClient
  .inputSchema(z.object({ activityId: z.string(), agentId: z.string() }))
  .action(async ({ parsedInput }) => {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });
    await abortChatGenerationShared(parsedInput, {
      userId: user.id,
      supabaseServiceRole: createSupabaseServiceRoleClient(),
      serverToken: getRealtimeServerToken(),
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    });
  });
