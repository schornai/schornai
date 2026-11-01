"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Search } from "lucide-react";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { TranscriberListCards } from "./TranscriberListCards";
import { TranscriberListTable } from "./TranscriberListTable";
import type { WorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { useT } from "next-i18next/client";
import { useTranscriberList } from "./TranscriberListProvider";

export function TranscriberList({
  favorites,
  models,
  workspaceClaims,
}: {
  favorites: SettingFavorites;
  models: AIModel[];
  workspaceClaims: WorkspaceClaims;
}) {
  const { filter, setFilter, view } = useTranscriberList();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberList",
  });

  const modelMap = new Map(models.map((model) => [model.identifier, model]));
  const workspaceMap = new Map(
    workspaceClaims.claims.map((workspace) => [workspace.id, workspace]),
  );

  return (
    <>
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
        <TranscriberListCards
          favorites={favorites}
          modelMap={modelMap}
          workspaceMap={workspaceMap}
        />
      ) : undefined}

      {view === "table" ? (
        <TranscriberListTable
          favorites={favorites}
          modelMap={modelMap}
          workspaceMap={workspaceMap}
        />
      ) : undefined}
    </>
  );
}
