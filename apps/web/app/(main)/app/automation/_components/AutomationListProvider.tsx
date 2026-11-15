"use client";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { createContext, useContext, type ReactNode } from "react";
import { useFilter } from "@/lib/useFilter";
import {
  NO_GROUP_KEY,
  useGroupSortView,
  type GroupSortFunctions,
} from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { Automation } from "@schornio/aibox-package-database/automation/_types";
type Groups = "trigger" | "status" | "first-letter" | "favorite";
type ListedAutomation = Automation & { favorite: boolean };
const functions: GroupSortFunctions<ListedAutomation, Groups, "name"> = {
  group: (group, item) =>
    group === "favorite"
      ? item.favorite
        ? "favorite"
        : "other"
      : group === "trigger"
        ? item.trigger.type
        : group === "status"
          ? item.enabled
            ? "enabled"
            : "paused"
          : group === "first-letter"
            ? item.name.trim().toUpperCase().charAt(0)
            : NO_GROUP_KEY,
  groupSort: (_, a, b) => a.localeCompare(b),
  sort: (_, a, b) => a.name.localeCompare(b.name),
};
function useList(
  automations: Automation[],
  preferences: Preferences,
  favorites?: SettingFavorites,
) {
  const data = automations.map((item) => ({
    ...item,
    favorite: Boolean(
      favorites?.favorites.some(
        (f) => f.type === "automation" && f.id === item.id,
      ),
    ),
  }));
  const filter = useFilter(data, { keys: ["name", "description", "message"] });
  const list = useGroupSortView<
    ListedAutomation,
    Groups,
    "name",
    "cards" | "table"
  >("/app/automation", filter.filteredData, functions, preferences, {
    sort: "name:asc",
    view: "cards",
  });
  return { ...filter, ...list, favorites };
}
const context = createContext<ReturnType<typeof useList> | undefined>(
  undefined,
);
export function AutomationListProvider({
  automations,
  userPreferences,
  favorites,
  children,
}: {
  automations: Automation[];
  userPreferences: Preferences;
  children: ReactNode;
  favorites?: SettingFavorites;
}) {
  return (
    <context.Provider value={useList(automations, userPreferences, favorites)}>
      {children}
    </context.Provider>
  );
}
export function useAutomationList() {
  const value = useContext(context);
  if (!value) throw new Error("useAutomationList called outside provider");
  return value;
}
