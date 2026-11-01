"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { BotMessageSquare, FileHeadphone, Info } from "lucide-react";
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
import type { SettingFavorites } from "../../../../../_models/currentUserConfigFavorites";
import { TranscriberInfo } from "../../_components/TranscriberInfo";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { useTranscriberEditor } from "./TranscriberEditor";

export function TranscriberEditorOverview({
  favorites,
  mode,
}: {
  favorites?: SettingFavorites;
  mode: "create" | "update";
}) {
  const router = useRouter();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorOverview",
  });
  const { transcriber, defaultTranscriber, relations } = useTranscriberEditor();

  const modelMap = new Map(
    relations.models.map((model) => [model.identifier, model]),
  );

  const workspace = relations.workspaces.find(
    (workspace) => workspace.id === transcriber?.workspaceId,
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

      <TranscriberInfo
        favorites={favorites}
        editDefaultTranscriber={defaultTranscriber}
        editable={true}
        modelMap={modelMap}
        transcriber={transcriber}
        workspace={workspace}
      />

      <hr className="my-10" />

      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title={t("helpTitle")}>
          <Info className="mx-auto" size={40} />
        </h2>

        <Alert>
          <FileHeadphone />
          <AlertDescription>{t("helpPromptDescription")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
