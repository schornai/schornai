"use client";

import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import { createContext, useContext } from "react";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";

type TranscriberWithFavorite = Transcriber_new & { favorite: boolean };

type Groups = "favorite" | "first-letter" | "workspace" | "model";

type Sorts = "name";

type Views = "cards" | "table";

const defaultPreferences: Preferences = {
  sort: "name:asc",
  view: "cards",
};

const functions: GroupSortFunctions<TranscriberWithFavorite, Groups, Sorts> = {
  group(group, transcriber) {
    switch (group) {
      case "favorite":
        return transcriber.favorite ? "favorite" : NO_GROUP_KEY;
      default:
      case "first-letter":
        return transcriber.name.trim().toUpperCase().charAt(0);
      case "workspace":
        return transcriber.workspaceId;
      case "model":
        return transcriber.modelIdentifier ?? NO_GROUP_KEY;
    }
  },
  groupSort(_type, groupKeyA, groupKeyB) {
    return groupKeyA.localeCompare(groupKeyB);
  },
  sort(_type, transcriberA, transcriberB) {
    return transcriberA.name.localeCompare(transcriberB.name);
  },
};

const transcriberListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<
        typeof useGroupSortView<TranscriberWithFavorite, Groups, Sorts, Views>
      >)
  | undefined
>(undefined);

export function TranscriberListProvider({
  transcriberWithFavorite: transcribersData,
  children,
  id,
  userPreferences,
}: {
  transcriberWithFavorite: TranscriberWithFavorite[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(transcribersData, {
    keys: ["name", "description", "modelIdentifier"],
  });

  const valueGroupSortView = useGroupSortView<
    TranscriberWithFavorite,
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
    <transcriberListContext.Provider
      value={{ ...valueFilter, ...valueGroupSortView }}
    >
      {children}
    </transcriberListContext.Provider>
  );
}

export function useTranscriberList() {
  const context = useContext(transcriberListContext);

  if (!context) {
    const error = new Error("useTranscriberList() called outside provider");
    logError("TranscriberListProvider", error);
    throw error;
  }

  return context;
}
