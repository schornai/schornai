"use client";

import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import { createContext, useContext } from "react";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import type { User } from "@schornio/aibox-package-database/user/_types";
import { getTimeGroups } from "@schornio/aibox-package-utils/groupByDays";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";

type Groups = "first-letter" | "sign-in-method" | "last-login";

type Sorts = "name" | "email" | "last-login";

type Views = "table";

const defaultPreferences: Preferences = {
  sort: "name:asc",
  view: "table",
};

const { sevenDaysAgoTime, startOfTodayTime, thirtyDaysAgoTime } = getTimeGroups(
  new Date(),
);

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

const functions: GroupSortFunctions<User, Groups, Sorts> = {
  group(group, user) {
    switch (group) {
      default:
      case "first-letter":
        return user.name?.trim().toUpperCase().charAt(0) ?? "";
      case "sign-in-method":
        return user.signInMethod;
      case "last-login":
        return user.lastSignInAt
          ? getTimeGroup(user.lastSignInAt.getTime())
          : NO_GROUP_KEY;
    }
  },
  groupSort(_type, groupKeyA, groupKeyB) {
    return groupKeyA.localeCompare(groupKeyB);
  },
  sort(type, userA, userB) {
    switch (type) {
      case "email":
        return (userA.email ?? "").localeCompare(userB.email ?? "");
      case "last-login":
        return (
          (userA.lastSignInAt?.getTime() ?? 0) -
          (userB.lastSignInAt?.getTime() ?? 0)
        );
      default:
      case "name":
        return (userA.name ?? "").localeCompare(userB.name ?? "");
    }
  },
};

const userListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<typeof useGroupSortView<User, Groups, Sorts, Views>>)
  | undefined
>(undefined);

export function UserListProvider({
  users: usersData,
  children,
  id,
  userPreferences,
}: {
  users: User[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(usersData, {
    keys: ["name", "email"],
  });

  const valueGroupSortView = useGroupSortView<User, Groups, Sorts, Views>(
    id,
    valueFilter.filteredData,
    functions,
    userPreferences,
    defaultPreferences,
  );

  return (
    <userListContext.Provider value={{ ...valueFilter, ...valueGroupSortView }}>
      {children}
    </userListContext.Provider>
  );
}

export function useUserList() {
  const context = useContext(userListContext);

  if (!context) {
    const error = new Error("useUserList() called outside provider");
    logError("UserListProvider", error);
    throw error;
  }

  return context;
}
