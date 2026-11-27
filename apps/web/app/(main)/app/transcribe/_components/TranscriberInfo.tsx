"use client";
import { ResourceRemovalDialog } from "../../../../_components/ResourceRemovalDialog";
import { deleteTranscriber } from "../_actions/deleteTranscriber";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { ResourceInfoLayout } from "../../../../_components/ResourceInfoLayout";
import { TranscriberIconGroupActions } from "./TranscriberIconGroupActions";
import { hasPermission } from "@/lib/hasPermission";
import { XRAGObjectActions } from "../../../../_components/xrag/XRAGObjectActions";

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
  showResourceActions = false,
  editTranscriberPathname,
  editDefaultTranscriber,
  editable,
  favorites,
  modelMap,
  transcriber,
  workspace,
}: {
  showResourceActions?: boolean;
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

  const { t: editorText } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditor",
  });
  const remove = useAction(deleteTranscriber);
  const id = transcriber?.id;
  const canManage = hasPermission({
    claim: workspace?.claim,
    permission: "workspace-admin",
  });
  return (
    <ContainerMain>
      <ResourceInfoLayout
        card={
          <TranscriberCard
            favorites={favorites}
            model={model}
            transcriber={transcriber}
            workspace={workspace}
          />
        }
        actions={
          showResourceActions &&
          id && (
            <TranscriberIconGroupActions
              display="buttons"
              favorites={favorites}
              workspace={workspace}
              transcriber={transcriber}
              packageActions={
                canManage && <XRAGObjectActions kind="transcriber" id={id} />
              }
              remove={
                canManage && (
                  <ResourceRemovalDialog
                    label={editorText("labelDeleteTranscriber")}
                    title={editorText("confirmDeleteTitle")}
                    description={editorText("confirmDeleteDescription", {
                      name: transcriber?.name,
                    })}
                    cancel={editorText("labelCancel")}
                    onOpen={remove.reset}
                    isPending={remove.isPending}
                    hasErrored={remove.hasErrored}
                    onConfirm={() => remove.execute({ transcriberId: id })}
                  />
                )
              }
            />
          )
        }
      >
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
      </ResourceInfoLayout>
    </ContainerMain>
  );
}
