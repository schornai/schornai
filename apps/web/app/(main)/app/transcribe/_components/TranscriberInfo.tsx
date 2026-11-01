"use client";

import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { InfoModel } from "../../../../_components/InfoModel";
import { InfoWorkspace } from "../../../../_components/InfoWorkspace";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import { TranscriberCard } from "./TranscriberCard";
import { TranscriberInfoPrompt } from "./TranscriberInfoPrompt";
import type { Transcriber_new } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";

export function TranscriberInfo({
  editTranscriberPathname,
  editDefaultTranscriber,
  editable,
  favorites,
  modelMap,
  transcriber,
  workspace,
}: {
  editTranscriberPathname?: string;
  editDefaultTranscriber?: Partial<Transcriber_new>;
  editable?: boolean;
  favorites?: SettingFavorites;
  modelMap?: Map<string | symbol, AIModel>;
  transcriber?: Partial<Transcriber_new>;
  workspace?: WorkspaceClaim;
}) {
  const model = transcriber?.modelIdentifier
    ? modelMap?.get(transcriber?.modelIdentifier)
    : undefined;

  return (
    <ContainerMain className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr]">
      <TranscriberCard
        favorites={favorites}
        model={model}
        transcriber={transcriber}
        workspace={workspace}
      />
      <div className="flex flex-col gap-1">
        {transcriber?.prompt ? (
          <TranscriberInfoPrompt
            editDefaultPrompt={transcriber.prompt}
            editTranscriberId={transcriber.id}
            editTranscriberPathname={editTranscriberPathname}
            prompt={transcriber.prompt}
          />
        ) : undefined}

        {transcriber?.modelIdentifier ? (
          <InfoModel
            editPathname={editTranscriberPathname}
            editDefaultModelIdentifier={editDefaultTranscriber?.modelIdentifier}
            editable={editable}
            modelIdentifier={transcriber?.modelIdentifier}
            model={model}
          />
        ) : undefined}

        <InfoWorkspace
          editPathname={editTranscriberPathname}
          editDefaultWorkspaceId={editDefaultTranscriber?.workspaceId}
          editable={editable}
          workspace={workspace}
        />
      </div>
    </ContainerMain>
  );
}
