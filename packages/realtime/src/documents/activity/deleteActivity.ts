import type { Activity } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function deleteActivity(document: YDoc, activityId: string) {
  document?.transact(() => {
    const activities = document.getMap<Activity>("activities");
    activities.delete(activityId);

    // Todo: if you delete a activity you should also stop the chat/transcription
    // Todo: and also delete activity for everyone else?
    // Maybe the best location for the two todos above ist not here but in the server action?
  });
}
