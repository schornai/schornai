"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { DocumentRepositoryListCards } from "./DocumentRepositoryListCards";
import { DocumentRepositoryListTable } from "./DocumentRepositoryListTable";
import { Search } from "lucide-react";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { useDocumentRepositoryList } from "./DocumentRepositoryListProvider";
import { useT } from "next-i18next/client";

export function DocumentRepositoryList({
  favorites,
  models,
  transcribers,
  workspaceClaims,
}: {
  favorites: SettingFavorites;
  models: AIModel[];
  transcribers: Transcriber_new[];
  workspaceClaims: WorkspaceClaims;
}) {
  const { filter, setFilter, view } = useDocumentRepositoryList();
  const { t } = useT("documentRepository", {
    keyPrefix: "_components.DocumentRepositoryList",
  });

  const modelsMap = new Map(models.map((model) => [model.identifier, model]));

  const transcriberMap = new Map(
    transcribers.map((transcriber) => [transcriber.identifier, transcriber]),
  );
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
        <DocumentRepositoryListCards
          favorites={favorites}
          modelsMap={modelsMap}
          transcriberMap={transcriberMap}
          workspaceMap={workspaceMap}
        />
      ) : undefined}

      {view === "table" ? (
        <DocumentRepositoryListTable
          favorites={favorites}
          modelsMap={modelsMap}
          transcriberMap={transcriberMap}
          workspaceMap={workspaceMap}
        />
      ) : undefined}
    </>
  );
}
