"use client";

import { AlertDescription } from "@schornio/aibox-package-ui/components/alert";
import { BotMessageSquare, FileHeadphone, Settings2 } from "lucide-react";
import {
  Checklist,
  ChecklistItem,
  ChecklistItemContent,
  ChecklistItemHeader,
  ChecklistItemIndicator,
} from "@schornio/aibox-package-ui/components/checklist";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { TranscriberInfoPrompt } from "../../_components/TranscriberInfoPrompt";
import { InfoWorkspace } from "../../../../../_components/InfoWorkspace";
import { InfoModel } from "../../../../../_components/InfoModel";
import { EditorOverviewSection } from "../../../../../_components/EditorOverviewSection";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { useTranscriberEditor } from "./TranscriberEditor";

export function TranscriberEditorOverview({
  mode,
}: {
  mode: "create" | "update";
}) {
  const router = useRouter();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorOverview",
  });
  const { transcriber, defaultTranscriber, relations } = useTranscriberEditor();

  const workspace = relations.workspaces.find(
    (workspace) => workspace.id === transcriber?.workspaceId,
  );

  const { t: tab } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditor",
  });
  const model = relations.models.find(
    (item) => item.identifier === transcriber?.modelIdentifier,
  );
  return (
    <>
      {mode === "create" ? (
        <>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BotMessageSquare />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <AlertDescription>{t("emptyDescription")}</AlertDescription>
            </EmptyHeader>
          </Empty>

          <ContainerMain size="narrow">
            <Checklist>
              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    (transcriber?.prompt?.trim().length ?? 0) > 0
                      ? "success"
                      : undefined
                  }
                />
                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => {
                    router.push(`?view=prompt`);
                  }}
                >
                  {t("labelDefinePrompt")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("descriptionDefinePrompt")}
                </ChecklistItemContent>
              </ChecklistItem>
            </Checklist>
          </ContainerMain>

          <hr className="my-10" />
        </>
      ) : undefined}

      <ContainerMain className="flex flex-col gap-4">
        <EditorOverviewSection
          view="prompt"
          icon={FileHeadphone}
          title={tab("tabPrompt")}
          description={t("helpPromptDescription")}
        >
          {transcriber?.prompt && (
            <TranscriberInfoPrompt
              prompt={transcriber?.prompt}
              editDefaultPrompt={defaultTranscriber?.prompt}
              editTranscriberId={transcriber?.id}
            />
          )}
        </EditorOverviewSection>
        <EditorOverviewSection
          view="settings"
          icon={Settings2}
          title={tab("tabSettings")}
        >
          {transcriber?.modelIdentifier && (
            <InfoModel
              modelIdentifier={transcriber.modelIdentifier}
              model={model}
              editDefaultModelIdentifier={defaultTranscriber?.modelIdentifier}
              editable
            />
          )}
          <InfoWorkspace
            workspace={workspace}
            editDefaultWorkspaceId={defaultTranscriber?.workspaceId}
            editable
          />
        </EditorOverviewSection>
      </ContainerMain>
    </>
  );
}
