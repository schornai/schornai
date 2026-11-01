"use server";

import { getRealtimeServerToken } from "@schornio/aibox-realtime/server/getRealtimeServerToken";

import {
  ServerBatchRealtimeProvider,
  ServerRealtimeProvider,
} from "@schornio/aibox-realtime/server/ServerRealtimeProvider";
import {
  getActivitiesDocumentName,
  getActivityDocumentName,
} from "@schornio/aibox-realtime/documents/activity/_utils";
import { ServerRealtimeWebsocketProvider } from "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/createSupabaseServiceRoleClient";
import { deleteActivity as deleteActivityRealtime } from "@schornio/aibox-realtime/documents/activity/deleteActivity";
import { getActivities } from "@schornio/aibox-realtime/documents/activity/getActivities";
import { getAllowedUserIdsByDocumentName } from "@schornio/aibox-realtime/_lib/getAllowedUserIdsByDocumentName";
import { getCurrentUser } from "@schornio/aibox-database/user/getCurrentUser";
import { redirect } from "next/navigation";
import { serverActionClient } from "@/lib/serverActionClient";
import { z } from "zod/v4";

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

    const userActivityDocumentName = getActivitiesDocumentName({
      userId: user.id,
    });
    await using userActivitiesProvider = new ServerRealtimeProvider({
      documentName: userActivityDocumentName,
      serverToken,
      websocketProvider,
    });

    await userActivitiesProvider.waitForSynced();

    const { activities: userActivities } = getActivities(
      userActivitiesProvider.document,
    );
    const activity = userActivities.get(activityId);

    const documentName = getActivityDocumentName(activity);

    if (documentName) {
      const supabaseServiceRole = createSupabaseServiceRoleClient();

      const allowedUserIds = await getAllowedUserIdsByDocumentName(
        documentName,
        {
          supabase: supabaseServiceRole,
        },
      );

      if (!allowedUserIds.find((allowed) => allowed === user.id)) {
        deleteActivityRealtime(userActivitiesProvider.document, activityId);
      } else {
        await using activities = new ServerBatchRealtimeProvider({
          documentNames: allowedUserIds.map((userId) =>
            getActivitiesDocumentName({ userId }),
          ),
          serverToken,
          websocketProvider,
        });
        await activities.waitForSynced();

        activities.batch(deleteActivityRealtime, activityId);
      }
    } else {
      deleteActivityRealtime(userActivitiesProvider.document, activityId);
    }

    if (redirectToDashboard) {
      redirect("/");
    }
  });
