import type { Doc } from "yjs";
import { getActivities } from "./getActivities.ts";
import { upsertActivity } from "./upsertActivity.ts";

/** The caller must own this activities document. Automatic labels preserve manual names. */
export function setActivityLabel(
  document: Doc,
  activityId: string,
  label: string,
  automatic = false,
) {
  const activity = getActivities(document).activities.get(activityId);
  if (!activity) throw new Error("NOT_FOUND");
  if (automatic && activity.labelUserInput)
    return { updated: false, label: activity.label };
  const normalized = label.trim();
  if (!normalized || normalized.length > 500) throw new Error("INVALID_LABEL");
  upsertActivity(
    document,
    { id: activityId, label: normalized, labelUserInput: !automatic },
    { minorChange: true },
  );
  return { updated: true, label: normalized };
}
