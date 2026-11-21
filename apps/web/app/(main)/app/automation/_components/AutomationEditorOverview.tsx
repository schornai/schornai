"use client";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { Info, Clock, MessageSquare } from "lucide-react";
import type { ComponentProps } from "react";
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
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { automationTriggerSchema } from "@schornio/aibox-package-database/automation/_schemas";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
import { AutomationInfo } from "./AutomationInfo";
export function AutomationEditorOverview({
  creating,
  ...props
}: ComponentProps<typeof AutomationInfo> & { creating: boolean }) {
  const { t } = useT("automation");
  const router = useRouter();
  const value = props.automation;
  const triggerValid =
    automationTriggerSchema.safeParse(value.trigger).success &&
    !(
      value.trigger.type === "storage" &&
      value.trigger.storage.type === "documentRepository" &&
      !value.trigger.storage.documentRepositoryId
    );
  const steps = [
    {
      view: "settings",
      label: "labelDefineName",
      description: "descriptionDefineName",
      done: Boolean(value.name.trim()),
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
      done: Boolean(value.agentId && value.message.trim()),
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
      <AutomationInfo {...props} editable preview />
      <hr className="my-10" />
      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title={t("labelHelp")}>
          <Info className="mx-auto" size={40} />
        </h2>
        <Alert>
          <Clock />
          <AlertDescription>{t("descriptionTrigger")}</AlertDescription>
        </Alert>
        <Alert>
          <MessageSquare />
          <AlertDescription>{t("descriptionStartChat")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
