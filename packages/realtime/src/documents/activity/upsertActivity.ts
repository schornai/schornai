import type { Activity } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function upsertActivity<T extends Activity>(
  document: YDoc,
  activity: Partial<T> & { id: T["id"] },
  config?: { labelOnInsert?: string; minorChange?: boolean },
) {
  document.transact(() => {
    const nowISO = new Date().toISOString();
    const activities = document.getMap<Activity>("activities");

    const currentActivity = activities.get(activity.id);
    if (currentActivity) {
      const updatedActivity: Activity = {
        ...currentActivity,
        ...activity,
      };

      if (!config?.minorChange) {
        updatedActivity.updatedAtISO = nowISO;
      }

      activities.set(activity.id, updatedActivity);
    } else {
      const newActivity: Activity = {
        createdAtISO: nowISO,
        id: activity.id,
        label: config?.labelOnInsert ?? "",
        labelUserInput: false,
        pinned: false,
        state: "idle",
        updatedAtISO: nowISO,
      };
      activities.set(activity.id, {
        ...newActivity,
        ...activity,
      });
    }
  });
}
