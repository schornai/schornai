"use client";

import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import { createContext, useContext } from "react";
import type { Activity } from "@schornio/aibox-realtime/documents/activity/_types";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import { getTimeGroups } from "@schornio/aibox-package-utils/groupByDays";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useActivites } from "../../_components/ActivityContextProvider";
import { useFilter } from "@/lib/useFilter";

type Groups = "pinned" | "state" | "type" | "updated" | "created";

type Sorts = "updated" | "created" | "label";

type Views = "list" | "table";

const defaultPreferences: Preferences = {
  group: "pinned",
  sort: "updated:desc",
  view: "table",
};

const { sevenDaysAgoTime, startOfTodayTime, thirtyDaysAgoTime } = getTimeGroups(
  new Date(),
);

const stateOrder = ["running", "idle", "success", "error"];
const typeOrder = ["chat", "transcription", "reindex"];
const timeOrder = ["today", "last7Days", "last30Days"];

function getTimeGroup(timestamp: number) {
  if (timestamp >= startOfTodayTime) {
    return "today";
  } else if (timestamp >= sevenDaysAgoTime) {
    return "last7Days";
  } else if (timestamp >= thirtyDaysAgoTime) {
    return "last30Days";
  }

  return NO_GROUP_KEY;
}

const functions: GroupSortFunctions<Activity, Groups, Sorts> = {
  group(group, activity) {
    switch (group) {
      case "pinned":
        return activity.pinned ? "pinned" : NO_GROUP_KEY;
      case "state":
        return activity.state;
      case "type":
        return activity.content?.type ?? NO_GROUP_KEY;
      case "updated":
        return getTimeGroup(new Date(activity.updatedAtISO).getTime());
      case "created":
        return getTimeGroup(new Date(activity.createdAtISO).getTime());
    }
    return NO_GROUP_KEY;
  },
  groupSort(type, groupKeyA, groupKeyB) {
    switch (type) {
      case "pinned":
        return groupKeyA === "pinned" ? (groupKeyB === "pinned" ? 0 : -1) : 1;
      case "state":
        return stateOrder.indexOf(groupKeyA) - stateOrder.indexOf(groupKeyB);
      case "type":
        return typeOrder.indexOf(groupKeyA) - typeOrder.indexOf(groupKeyB);
      case "updated":
      case "created":
        return timeOrder.indexOf(groupKeyA) - timeOrder.indexOf(groupKeyB);
    }
    return groupKeyA.localeCompare(groupKeyB);
  },
  sort(type, activityA, activityB) {
    switch (type) {
      case "created":
        return activityA.createdAtISO.localeCompare(activityB.createdAtISO);
      default:
      case "updated":
        return activityA.updatedAtISO.localeCompare(activityB.updatedAtISO);
      case "label":
        return activityA.label.localeCompare(activityB.label);
    }
  },
};

const activityListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<typeof useGroupSortView<Activity, Groups, Sorts, Views>>)
  | undefined
>(undefined);

export function ActivityListProvider({
  children,
  id,
  userPreferences,
}: {
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const { activities } = useActivites();

  const valueFilter = useFilter(activities, {
    keys: ["label"],
  });

  const valueGroupSortView = useGroupSortView<Activity, Groups, Sorts, Views>(
    id,
    valueFilter.filteredData,
    functions,
    userPreferences,
    defaultPreferences,
  );

  return (
    <activityListContext.Provider
      value={{ ...valueFilter, ...valueGroupSortView }}
    >
      {children}
    </activityListContext.Provider>
  );
}

export function useActivityList() {
  const context = useContext(activityListContext);

  if (!context) {
    const error = new Error("useActivityList() called outside provider");
    logError("ActivityListProvider", error);
    throw error;
  }

  return context;
}
