"use client";
import { AutomationRemove } from "./AutomationRemove";
import { ResourceInfoLayout } from "../../../../_components/ResourceInfoLayout";
import { AutomationIconGroupActions } from "./AutomationIconGroupActions";
import { hasPermission } from "@/lib/hasPermission";
import { XRAGObjectActions } from "../../../../_components/xrag/XRAGObjectActions";
import type { WorkspaceClaim } from "../../../../_models/getWorkspaceClaims";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { AutomationCard } from "./AutomationCard";
import { useT } from "next-i18next/client";
import type { AutomationDisplay } from "./AutomationNextRun";
import { Power } from "lucide-react";
import {
  AutomationInfoChat,
  AutomationInfoSection,
  AutomationInfoTrigger,
} from "./AutomationInfoDetails";
export function AutomationInfo({
  showResourceActions = false,
  automation,
  workspace,
  editDefaultAutomation,
  favorites,
  agents = [],
  repositories = [],
  editable = false,
  preview = false,
}: {
  showResourceActions?: boolean;
  automation: AutomationDisplay;
  workspace?: WorkspaceClaim;
  editDefaultAutomation?: AutomationInput;
  favorites?: SettingFavorites;
  agents?: Agent[];
  repositories?: DocumentRepository[];
  editable?: boolean;
  preview?: boolean;
}) {
  const { t } = useT("automation");
  const editPath = (view: string) =>
    editable
      ? `${preview ? "" : `/app/automation/${automation.id}/edit`}?view=${view}`
      : undefined;
  const canManage = hasPermission({
    claim: workspace?.claim,
    permission: "workspace-admin",
  });
  return (
    <ContainerMain>
      <ResourceInfoLayout
        card={
          <AutomationCard
            automation={automation}
            preview={preview}
            favorites={favorites}
          />
        }
        actions={
          showResourceActions &&
          !preview &&
          automation?.id && (
            <AutomationIconGroupActions
              display="buttons"
              favorites={favorites}
              automation={automation}
              packageActions={
                canManage && (
                  <XRAGObjectActions kind="automation" id={automation.id} />
                )
              }
              remove={<AutomationRemove id={automation.id} labeled />}
            />
          )
        }
      >
        {!preview && (
          <AutomationInfoSection
            icon={Power}
            title={t(automation.enabled ? "labelEnabled" : "labelPaused")}
            editPath={editPath("default")}
            changed={Boolean(
              editable &&
              editDefaultAutomation &&
              editDefaultAutomation.enabled !== automation.enabled,
            )}
          >
            <p>
              {t(
                automation.enabled ? "descriptionEnabled" : "descriptionPaused",
              )}
            </p>
          </AutomationInfoSection>
        )}
        <AutomationInfoTrigger
          automation={automation}
          repositories={repositories}
          original={editable ? editDefaultAutomation : undefined}
          editHref={editPath("trigger")}
        />
        <AutomationInfoChat
          automation={automation}
          agents={agents}
          original={editable ? editDefaultAutomation : undefined}
          editHref={editPath("chat")}
        />
      </ResourceInfoLayout>
    </ContainerMain>
  );
}
