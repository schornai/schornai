"use client";

import { NO_GROUP_KEY, useGroupSortView } from "@/lib/groupSortView/hook";
import { createContext, useContext } from "react";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { GroupSortFunctions } from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import type { ReactNode } from "react";
import { logError } from "@schornio/aibox-package-ui/components/error-log";
import { useFilter } from "@/lib/useFilter";

type AgentWithFavorite = Agent & { favorite: boolean };

type Groups =
  | "favorite"
  | "first-letter"
  | "workspace"
  | "model"
  | "document-repository"
  | "role-count";

type Sorts = "name";

type Views = "cards" | "avatars" | "list" | "table";

const defaultPreferences: Preferences = {
  group: "favorite",
  sort: "name:asc",
  view: "cards",
};

const functions: GroupSortFunctions<AgentWithFavorite, Groups, Sorts> = {
  group(group, agent) {
    switch (group) {
      case "document-repository":
        return new Set(
          agent.roles
            .map((role) =>
              role.documentRepositoryMounts.map(
                (mount) => mount.documentRepositoryIdentifier,
              ),
            )
            .flat(),
        );
      case "favorite":
        return agent.favorite ? "favorite" : NO_GROUP_KEY;
      default:
      case "first-letter":
        return agent.name.trim().toUpperCase().charAt(0);
      case "workspace":
        return agent.workspaceId;
      case "model":
        return agent.modelIdentifier;
      case "role-count":
        return agent.roles.length.toString();
    }
  },
  groupSort(_type, groupKeyA, groupKeyB) {
    return groupKeyA.localeCompare(groupKeyB);
  },
  sort(_type, agentA, agentB) {
    return agentA.name.localeCompare(agentB.name);
  },
};

const agentListContext = createContext<
  | (ReturnType<typeof useFilter> &
      ReturnType<
        typeof useGroupSortView<AgentWithFavorite, Groups, Sorts, Views>
      >)
  | undefined
>(undefined);

export function AgentListProvider({
  agentsWithFavorite: agentsData,
  children,
  id,
  userPreferences,
}: {
  agentsWithFavorite: AgentWithFavorite[];
  children?: ReactNode;
  id: string;
  userPreferences: Preferences;
}) {
  const valueFilter = useFilter(agentsData, {
    keys: ["name", "description", "modelIdentifier"],
  });

  const valueGroupSortView = useGroupSortView<
    AgentWithFavorite,
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
    <agentListContext.Provider
      value={{ ...valueFilter, ...valueGroupSortView }}
    >
      {children}
    </agentListContext.Provider>
  );
}

export function useAgentList() {
  const context = useContext(agentListContext);

  if (!context) {
    const error = new Error("useAgentList() called outside provider");
    logError("AgentListProvider", error);
    throw error;
  }

  return context;
}
