"use server";
import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { removeActivityFromHistory } from "@schornio/aibox-realtime/documents/activity/removeActivityFromHistory";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { getCurrentUser } from "@schornio/aibox-database/user/getCurrentUser";
import { redirect } from "next/navigation";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
export const deleteActivity = serverActionClient
  .inputSchema(
    z.object({
      activityId: z.string(),
      redirectToDashboard: z.boolean().optional(),
    }),
  )
  .action(async ({ parsedInput: { activityId, redirectToDashboard } }) => {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });

    const serverToken = getRealtimeServerToken();
    const websocketProvider = new ServerRealtimeWebsocketProvider();

    await removeActivityFromHistory(activityId, {
      userId: user.id,
      supabaseServiceRole: createSupabaseServiceRoleClient(),
      serverToken,
      websocketProvider,
    });

    revalidatePath("/", "layout");
    if (redirectToDashboard) {
      redirect("/");
    }
  });
