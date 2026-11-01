"use client";

import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import { createContext, useContext } from "react";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import type { Role } from "@schornio/aibox-package-database/workspace/_types";
import type { User } from "@schornio/aibox-package-database/user/_types";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";

export type UserWithWorkspaceRole = {
  workspaceRole: Exclude<Role, "admin"> | "none";
} & User;

type Groups = "first-letter" | "permission";

type Sorts = "name" | "email";

type Views = "table";

const roleOrder = ["admin", "workspace-admin", "editor", "user"];

const defaultPreferences: Preferences = {
  group: "permission",
  sort: "name:asc",
  view: "table",
};

const functions: GroupSortFunctions<UserWithWorkspaceRole, Groups, Sorts> = {
  group(group, user) {
    switch (group) {
      default:
      case "first-letter":
        return user.name?.trim().toUpperCase().charAt(0) ?? "";
      case "permission":
        return user.workspaceRole ?? NO_GROUP_KEY;
    }
  },
  groupSort(type, groupKeyA, groupKeyB) {
    switch (type) {
      default:
        return groupKeyA.localeCompare(groupKeyB);
      case "permission":
        return roleOrder.indexOf(groupKeyA) - roleOrder.indexOf(groupKeyB);
    }
  },
  sort(type, userA, userB) {
    switch (type) {
      default:
      case "name":
        return (userA.name ?? "").localeCompare(userB.name ?? "");
      case "email":
        return (userA.email ?? "").localeCompare(userB.email ?? "");
    }
  },
};

const workspaceEditPermissionListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<
        typeof useGroupSortView<UserWithWorkspaceRole, Groups, Sorts, Views>
      >)
  | undefined
>(undefined);

export function WorkspaceEditPermissionListProvider({
  users: usersData,
  children,
  id,
  userPreferences,
}: {
  users: UserWithWorkspaceRole[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(usersData, {
    keys: ["name", "description"],
  });

  const valueGroupSortView = useGroupSortView<
    UserWithWorkspaceRole,
    Groups,
    Sorts,
    Views
  >(
    id,
    valueFilter.filteredData,
    functions,
    userPreferences,
    defaultPreferences,
  );

  return (
    <workspaceEditPermissionListContext.Provider
      value={{ ...valueFilter, ...valueGroupSortView }}
    >
      {children}
    </workspaceEditPermissionListContext.Provider>
  );
}

export function useWorkspaceEditPermissionList() {
  const context = useContext(workspaceEditPermissionListContext);

  if (!context) {
    const error = new Error(
      "useWorkspaceEditPermissionList() called outside provider",
    );
    logError("WorkspaceEditPermissionListProvider", error);
    throw error;
  }

  return context;
}
