"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { AgentListCards } from "./AgentListCards";
import { AgentListTable } from "./AgentListTable";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { Search } from "lucide-react";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { WorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { useAgentList } from "./AgentListProvider";
import { useT } from "next-i18next/client";

export function AgentList({
  documentRepositories,
  favorites,
  models,
  workspaceClaims,
}: {
  documentRepositories: DocumentRepository[];
  favorites: SettingFavorites;
  models: AIModel[];
  workspaceClaims: WorkspaceClaims;
}) {
  const { filter, setFilter, view } = useAgentList();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentList",
  });

  const documentRepositoryMap = new Map(
    documentRepositories.map((repo) => [repo.identifier, repo]),
  );
  const modelMap = new Map(models.map((model) => [model.identifier, model]));
  const workspaceMap = new Map(
    workspaceClaims.claims.map((workspace) => [workspace.id, workspace]),
  );

  return (
    <div>
      <ContainerMain className="flex justify-center">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            onChange={(event) => setFilter(event.currentTarget.value)}
            placeholder={t("placeholderSearch")}
            value={filter ?? ""}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </ContainerMain>

      {view === "cards" ? (
        <AgentListCards
          documentRepositoryMap={documentRepositoryMap}
          favorites={favorites}
          modelMap={modelMap}
          workspaceMap={workspaceMap}
        />
      ) : undefined}

      {view === "table" ? (
        <AgentListTable
          documentRepositoryMap={documentRepositoryMap}
          favorites={favorites}
          modelMap={modelMap}
          workspaceMap={workspaceMap}
        />
      ) : undefined}
    </div>
  );
}
