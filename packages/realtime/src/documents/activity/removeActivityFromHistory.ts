import type { SupabaseClient } from "@schornio/aibox-database/_shared/_types";
import type { ServerRealtimeWebsocketProvider } from "../../server/ServerRealtimeWebsocketProvider.ts";
import {
  ServerRealtimeProvider,
  ServerBatchRealtimeProvider,
} from "../../server/ServerRealtimeProvider.ts";
import {
  getActivitiesDocumentName,
  getActivityDocumentName,
} from "./_utils.ts";
import { getActivities } from "./getActivities.ts";
import { deleteActivity } from "./deleteActivity.ts";
import { getAllowedUserIdsByDocumentName } from "../../_lib/getAllowedUserIdsByDocumentName.ts";
/** Authenticated userId required. Removes shared history entries only for an actual participant; does not delete activity files. */
export async function removeActivityFromHistory(
  activityId: string,
  {
    userId,
    supabaseServiceRole,
    serverToken,
    websocketProvider,
  }: {
    userId: string;
    supabaseServiceRole: SupabaseClient;
    serverToken: `Worker ${string}`;
    websocketProvider: ServerRealtimeWebsocketProvider;
  },
) {
  const options = { serverToken, websocketProvider };
  await using mine = new ServerRealtimeProvider({
    ...options,
    documentName: getActivitiesDocumentName({ userId }),
  });
  await mine.waitForSynced();
  const activity = getActivities(mine.document).activities.get(activityId);
  const name = getActivityDocumentName(activity);
  const ids = name
    ? await getAllowedUserIdsByDocumentName(name, {
        supabase: supabaseServiceRole,
      })
    : [];
  if (ids.includes(userId)) {
    await using all = new ServerBatchRealtimeProvider({
      ...options,
      documentNames: ids.map((userId) => getActivitiesDocumentName({ userId })),
    });
    await all.waitForSynced();
    all.batch(deleteActivity, activityId);
    await all.waitForSynced();
  } else {
    deleteActivity(mine.document, activityId);
    await mine.waitForSynced();
  }
}
