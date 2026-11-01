"use client";

import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import { createContext, useContext } from "react";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";

type DocumentRepositoryWithFavorite = DocumentRepository & {
  favorite: boolean;
};

type Groups =
  "favorite" | "first-letter" | "workspace" | "embedding-model" | "transcriber";

type Sorts = "name";

type Views = "cards" | "table";

const defaultPreferences: Preferences = {
  sort: "name:asc",
  view: "cards",
};

const functions: GroupSortFunctions<
  DocumentRepositoryWithFavorite,
  Groups,
  Sorts
> = {
  group(group, documentRepository) {
    switch (group) {
      case "favorite":
        return documentRepository.favorite ? "favorite" : NO_GROUP_KEY;
      default:
      case "first-letter":
        return documentRepository.name.trim().toUpperCase().charAt(0);
      case "workspace":
        return documentRepository.workspaceId ?? NO_GROUP_KEY;
      case "embedding-model":
        return (
          documentRepository.index?.embedding?.modelIdentifier ?? NO_GROUP_KEY
        );
      case "transcriber":
        return documentRepository.transcriberIdentifier ?? NO_GROUP_KEY;
    }
  },
  groupSort(_type, groupKeyA, groupKeyB) {
    return groupKeyA.localeCompare(groupKeyB);
  },
  sort(_type, documentRepositoryA, documentRepositoryB) {
    return documentRepositoryA.name.localeCompare(documentRepositoryB.name);
  },
};

const documentRepositoryListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<
        typeof useGroupSortView<
          DocumentRepositoryWithFavorite,
          Groups,
          Sorts,
          Views
        >
      >)
  | undefined
>(undefined);

export function DocumentRepositoryListProvider({
  documentRepositoriesWithFavorite: documentRepositoriesData,
  children,
  id,
  userPreferences,
}: {
  documentRepositoriesWithFavorite: DocumentRepositoryWithFavorite[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(documentRepositoriesData, {
    keys: ["name", "description"],
  });

  const valueGroupSortView = useGroupSortView<
    DocumentRepositoryWithFavorite,
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
    <documentRepositoryListContext.Provider
      value={{ ...valueFilter, ...valueGroupSortView }}
    >
      {children}
    </documentRepositoryListContext.Provider>
  );
}

export function useDocumentRepositoryList() {
  const context = useContext(documentRepositoryListContext);

  if (!context) {
    const error = new Error(
      "useDocumentRepositoryList() called outside provider",
    );
    logError("DocumentRepositoryListProvider", error);
    throw error;
  }

  return context;
}
