import type { Activity } from "./_types.ts";
import type { Doc as YDoc } from "yjs";

export function getActivities(document: YDoc) {
  const activities = document.getMap<Activity>("activities");

  return {
    activities,
  };
}
