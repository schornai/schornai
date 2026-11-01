"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import { ServerRealtimeProvider } from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getActivitiesDocumentName } from "@schornio/aibox-realtime/documents/activity/_utils";
import { getCurrentUser } from "@schornio/aibox-database/user/getCurrentUser";
import { serverActionClient } from "@/lib/serverActionClient";
import { upsertActivity } from "@schornio/aibox-realtime/documents/activity/upsertActivity";
import { z } from "zod/v4";

export const pinActivity = serverActionClient
  .inputSchema(
    z.object({
      activityId: z.string(),
      pinned: z.boolean(),
    }),
  )
  .action(async ({ parsedInput: { activityId, pinned } }) => {
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser({ supabaseAuth: supabase.auth });

    const serverToken = getRealtimeServerToken();
    const websocketProvider = new ServerRealtimeWebsocketProvider();

    const userActivityDocumentName = getActivitiesDocumentName({
      userId: user.id,
    });
    await using userActivitesProvider = new ServerRealtimeProvider({
      documentName: userActivityDocumentName,
      serverToken,
      websocketProvider,
    });

    await userActivitesProvider.waitForSynced();

    upsertActivity(
      userActivitesProvider.document,
      { id: activityId, pinned },
      { minorChange: true },
    );
  });
