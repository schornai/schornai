"use client";

import { createContext, useContext } from "react";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { ReactNode } from "react";
import { getActivities } from "@schornio/aibox-realtime/documents/activity/getActivities";
import type { getActivityTypeInfos } from "@schornio/aibox-package-database/activity/getActivityTypeInfos";
import { groupByDays } from "@schornio/aibox-package-utils/groupByDays";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useHocuspocusProvider } from "@hocuspocus/provider-react";
import { useRealtimeMap } from "@/lib/useRealtimeMap";

const context = createContext<
  | {
      typeInfos: Awaited<ReturnType<typeof getActivityTypeInfos>>;
      provider: HocuspocusProvider;
    }
  | undefined
>(undefined);

export function ActivityContextProvider({
  children,
  typeInfos,
}: {
  children: ReactNode;
  typeInfos: Awaited<ReturnType<typeof getActivityTypeInfos>>;
}) {
  const provider = useHocuspocusProvider();

  return (
    <context.Provider value={{ provider, typeInfos }}>
      {children}
    </context.Provider>
  );
}

function useContextSafe() {
  const safeContext = useContext(context);
  if (!safeContext) {
    const error = new Error("useContextSafe() called outside provider");
    logError("ActivityContextProvider", error);
    throw error;
  }
  return safeContext;
}

export function useActivites() {
  const { provider } = useContextSafe();

  const activities = [
    ...useRealtimeMap(getActivities(provider.document).activities).values(),
  ].toSorted((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO));

  const pinnedActivities = activities.filter((activity) => activity.pinned);

  const groups = groupByDays(
    activities,
    (activity) => new Date(activity.updatedAtISO),
  );

  return {
    activities,
    pinnedActivities,
    ...groups,
  };
}

export function useActivityTypeInfos() {
  const { typeInfos } = useContextSafe();
  return typeInfos;
}
