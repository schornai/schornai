"use client";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { Zap, Settings2, MessageSquare } from "lucide-react";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { AutomationDisplay } from "./AutomationNextRun";
import {
  Checklist,
  ChecklistItem,
  ChecklistItemIndicator,
  ChecklistItemHeader,
  ChecklistItemContent,
} from "@schornio/aibox-package-ui/components/checklist";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { automationTriggerSchema } from "@schornio/aibox-package-database/automation/_schemas";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
import {
  AutomationInfoChat,
  AutomationInfoTrigger,
} from "./AutomationInfoDetails";
import { EditorOverviewSection } from "../../../../_components/EditorOverviewSection";
export function AutomationEditorOverview({
  creating,
  automation,
  agents,
  repositories,
  editDefaultAutomation,
}: {
  creating: boolean;
  automation: AutomationDisplay;
  agents?: Agent[];
  repositories?: DocumentRepository[];
  editDefaultAutomation?: AutomationInput;
}) {
  const { t } = useT("automation");
  const router = useRouter();
  const triggerValid =
    automationTriggerSchema.safeParse(automation.trigger).success &&
    !(
      automation.trigger.type === "storage" &&
      automation.trigger.storage.type === "documentRepository" &&
      !automation.trigger.storage.documentRepositoryId
    );
  const steps = [
    {
      view: "settings",
      label: "labelDefineName",
      description: "descriptionDefineName",
      done: Boolean(automation.name.trim()),
    },
    {
      view: "trigger",
      label: "labelDefineTrigger",
      description: "descriptionDefineTrigger",
      done: triggerValid,
    },
    {
      view: "chat",
      label: "labelDefineChat",
      description: "descriptionDefineChat",
      done: Boolean(automation.agentId && automation.message.trim()),
    },
  ];
  return (
    <>
      {creating && (
        <>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleChevronsRight />
              </EmptyMedia>
              <EmptyTitle>{t("labelNew")}</EmptyTitle>
              <EmptyDescription>
                {t("descriptionEditorOverview")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          <ContainerMain size="narrow">
            <Checklist>
              {steps.map((step) => (
                <ChecklistItem key={step.view}>
                  <ChecklistItemIndicator
                    variant={step.done ? "success" : undefined}
                  />
                  <ChecklistItemHeader
                    className="cursor-pointer"
                    onClick={() => router.push(`?view=${step.view}`)}
                  >
                    {t(step.label)}
                  </ChecklistItemHeader>
                  <ChecklistItemContent>
                    {t(step.description)}
                  </ChecklistItemContent>
                </ChecklistItem>
              ))}
            </Checklist>
          </ContainerMain>
          <hr className="my-10" />
        </>
      )}
      <ContainerMain className="flex flex-col gap-4">
        <EditorOverviewSection
          view="trigger"
          icon={Zap}
          title={t("labelTrigger")}
          description={t("descriptionTrigger")}
        >
          <AutomationInfoTrigger
            automation={automation}
            original={editDefaultAutomation}
            repositories={repositories}
            editHref="?view=trigger"
          />
        </EditorOverviewSection>
        <EditorOverviewSection
          view="chat"
          icon={MessageSquare}
          title={t("labelStartChat")}
          description={t("descriptionStartChat")}
        >
          <AutomationInfoChat
            automation={automation}
            original={editDefaultAutomation}
            agents={agents}
            editHref="?view=chat"
          />
        </EditorOverviewSection>
        <EditorOverviewSection
          view="settings"
          icon={Settings2}
          title={t("labelSettings")}
        />
      </ContainerMain>
    </>
  );
}
