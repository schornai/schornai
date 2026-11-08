"use server";

import { z } from "zod/mini";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { retryChatGeneration as retryChat } from "@schornio/aibox-realtime/documents/chat/retryChatGeneration";

export const retryChatGeneration = serverActionClient
  .inputSchema(
    z.object({
      activityId: z.uuid(),
      agentId: z.string().check(z.minLength(1)),
    }),
  )
  .action(async ({ parsedInput }) => {
    const supabase = await createSupabaseServerClient();
    const [user, userClaims] = await Promise.all([
      getCurrentUser({ supabaseAuth: supabase.auth }),
      getCurrentUserClaims({ supabaseAuth: supabase.auth }),
    ]);
    await retryChat(parsedInput, {
      supabase,
      userId: user.id,
      userClaims,
      serverToken: getRealtimeServerToken(),
      websocketProvider: new ServerRealtimeWebsocketProvider(),
    });
    revalidatePath(`/agent/${parsedInput.agentId}/${parsedInput.activityId}`);
  });
