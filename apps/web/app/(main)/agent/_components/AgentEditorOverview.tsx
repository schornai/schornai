"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  BotMessageSquare,
  Info,
  Lightbulb,
  Settings2,
  Shapes,
} from "lucide-react";
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
import { AgentInfo } from "./AgentInfo";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import { useAgentEditor } from "./AgentEditor";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentEditorOverview({
  favorites,
  mode,
}: {
  favorites?: SettingFavorites;
  mode: "create" | "update";
}) {
  const router = useRouter();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorOverview",
  });
  const { agent, defaultAgent, relations } = useAgentEditor();

  const documentRepositoryMap = new Map(
    relations.documentRepositories.map((repo) => [repo.identifier, repo]),
  );

  const modelMap = new Map(
    relations.models.map((model) => [model.identifier, model]),
  );

  const workspace = relations.workspaces.find(
    (workspace) => workspace.id === agent?.workspaceId,
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
                    agent?.roles?.some((role) => role.prompt.trim().length > 0)
                      ? "success"
                      : undefined
                  }
                />
                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => {
                    const firstRoleId = agent?.roles?.[0]?.id;
                    if (firstRoleId) {
                      router.push(
                        `?view=roles&role-${firstRoleId}=prompt#role-${firstRoleId}`,
                      );
                    } else {
                      router.push(`?view=roles`);
                    }
                  }}
                >
                  {t("labelDefinePrompt")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("descriptionDefinePrompt")}
                </ChecklistItemContent>
              </ChecklistItem>
              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    agent?.roles?.some(
                      (role) =>
                        role.documentRepositoryMounts.length > 0 ||
                        (role.mcps?.length ?? 0) > 0 ||
                        role.toolWebAccess,
                    )
                      ? "success"
                      : undefined
                  }
                />
                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => {
                    const firstRoleId = agent?.roles?.[0]?.id;
                    if (firstRoleId) {
                      router.push(
                        `?view=roles&role-${firstRoleId}=tools#role-${firstRoleId}`,
                      );
                    } else {
                      router.push(`?view=roles`);
                    }
                  }}
                >
                  {t("labelConnectTools")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("descriptionConnectTools")}
                </ChecklistItemContent>
              </ChecklistItem>
              <ChecklistItem>
                <ChecklistItemIndicator
                  variant={
                    (agent?.documentation?.trim().length ?? 0) > 0 ||
                    (agent?.recommendedMessages?.length ?? 0) > 0
                      ? "success"
                      : undefined
                  }
                />

                <ChecklistItemHeader
                  className="cursor-pointer"
                  onClick={() => router.push("?view=docs")}
                >
                  {t("labelWriteDocs")}
                </ChecklistItemHeader>
                <ChecklistItemContent>
                  {t("descriptionWriteDocs")}
                </ChecklistItemContent>
              </ChecklistItem>
            </Checklist>
          </ContainerMain>

          <hr className="my-10" />
        </>
      ) : undefined}

      <AgentInfo
        agent={agent}
        documentRepositoryMap={documentRepositoryMap}
        favorites={favorites}
        editDefaultAgent={defaultAgent}
        editable={true}
        modelMap={modelMap}
        workspace={workspace}
      />

      <hr className="my-10" />

      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title="Help">
          <Info className="mx-auto" size={40} />
        </h2>

        <Alert>
          <Shapes />
          <AlertDescription>{t("infoRoleDefinition")}</AlertDescription>
        </Alert>

        <Alert>
          <Lightbulb />
          <AlertDescription>{t("infoDocsDescription")}</AlertDescription>
        </Alert>

        <Alert>
          <Settings2 />
          <AlertDescription>{t("infoAppearanceDescription")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
