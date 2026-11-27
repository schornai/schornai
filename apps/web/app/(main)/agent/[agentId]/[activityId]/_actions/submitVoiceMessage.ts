"use server";
import { TranscriberConfigurationError } from "@schornio/aibox-package-database/transcriber/requireTranscriber";
import { revalidatePath } from "next/cache";
import { serverActionClient } from "@/lib/serverActionClient";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getCurrentUser } from "@schornio/aibox-package-database/user/getCurrentUser";
import { getCurrentUserClaims } from "@schornio/aibox-package-database/user/getCurrentUserClaims";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import {
  submitVoiceMessageSchema,
  submitVoiceMessage as submit,
} from "@schornio/aibox-realtime/documents/chat/submitVoiceMessage";

export const submitVoiceMessage = serverActionClient
  .inputSchema(submitVoiceMessageSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createSupabaseServerClient();
    const [user, userClaims] = await Promise.all([
      getCurrentUser({ supabaseAuth: supabase.auth }),
      getCurrentUserClaims({ supabaseAuth: supabase.auth }),
    ]);
    try {
      await submit(parsedInput, {
        supabase,
        userId: user.id,
        userClaims,
        serverToken: getRealtimeServerToken(),
        websocketProvider: new ServerRealtimeWebsocketProvider(),
      });
    } catch (error) {
      if (error instanceof TranscriberConfigurationError)
        return { queued: false as const, issue: error.code };
      if (
        error instanceof Error &&
        ["CHAT_BUSY", "TOOL_APPROVAL_REQUIRED", "AUDIO_FILE_REQUIRED"].includes(
          error.message,
        )
      )
        return { queued: false as const, issue: undefined };
      throw error;
    }
    revalidatePath(`/agent/${parsedInput.agentId}/${parsedInput.activityId}`);
    return { queued: true as const };
  });
