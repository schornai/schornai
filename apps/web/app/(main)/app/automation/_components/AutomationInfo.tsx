"use client";
import type { SettingFavorites } from "../../../../_models/currentUserConfigFavorites";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@schornio/aibox-package-ui/components/collapsible";
import {
  Zap,
  Clock,
  ChevronsUpDown,
  MessageSquare,
  BotMessageSquare,
  Pencil,
  Power,
  type LucideIcon,
} from "lucide-react";
import { useT } from "next-i18next/client";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoTitle } from "../../../../_components/InfoTitle";
import { InfoActions } from "../../../../_components/InfoActions";
import { AutomationNextRun, type AutomationDisplay } from "./AutomationNextRun";
import { AutomationCard } from "./AutomationCard";
export function AutomationInfo({
  automation,
  editDefaultAutomation,
  favorites,
  agents = [],
  repositories = [],
  editable = false,
  preview = false,
}: {
  automation: AutomationDisplay;
  editDefaultAutomation?: AutomationInput;
  favorites?: SettingFavorites;
  agents?: Agent[];
  repositories?: DocumentRepository[];
  editable?: boolean;
  preview?: boolean;
}) {
  const { t, i18n } = useT("automation");
  const trigger = automation.trigger;
  const repositoryId =
    trigger.type === "storage" && trigger.storage.type === "documentRepository"
      ? trigger.storage.documentRepositoryId
      : undefined;
  const selectedRepository = repositories.find(
    (repo) => repo.id === repositoryId,
  );
  const editPath = (view: string) =>
    editable
      ? `${preview ? "" : `/app/automation/${automation.id}/edit`}?view=${view}`
      : undefined;
  const changed = (key: keyof AutomationInput) =>
    Boolean(
      editable &&
      editDefaultAutomation &&
      JSON.stringify(editDefaultAutomation[key]) !==
        JSON.stringify(automation[key]),
    );
  const agent = agents.find((agent) => agent.id === automation.agentId);
  const schedule = trigger.type === "time" ? trigger.schedule : undefined;
  const summary = !schedule
    ? ""
    : schedule.kind === "hours" || schedule.kind === "days"
      ? t(`summary.${schedule.kind}`, { count: schedule.every })
      : schedule.kind === "once"
        ? schedule.at
          ? new Date(schedule.at).toLocaleString(i18n.resolvedLanguage ?? "de")
          : t("labelNotConfigured")
        : schedule.kind === "monthly"
          ? t("summary.monthly", {
              day: schedule.day,
              time: schedule.time,
              timezone: schedule.timezone,
            })
          : schedule.weekdays.length === 7
            ? t("summary.daily", {
                time: schedule.time,
                timezone: schedule.timezone,
              })
            : `${schedule.weekdays.map((day) => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "de", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 15 + day)))).join(", ")} · ${schedule.time} (${schedule.timezone})`;
  return (
    <ContainerMain className="grid grid-cols-1 gap-3 md:grid-cols-[auto_1fr]">
      <AutomationCard
        automation={automation}
        preview={preview}
        favorites={favorites}
      />
      <div className="flex min-w-0 flex-col gap-1">
        {!preview && (
          <InfoSection
            icon={Power}
            title={t(automation.enabled ? "labelEnabled" : "labelPaused")}
            editPath={editPath("default")}
            changed={changed("enabled")}
          >
            <p>
              {t(
                automation.enabled ? "descriptionEnabled" : "descriptionPaused",
              )}
            </p>
          </InfoSection>
        )}
        <InfoSection
          icon={Zap}
          title={t("labelTrigger")}
          editPath={editPath("trigger")}
          changed={changed("trigger")}
          summary={
            trigger.type === "time"
              ? summary
              : `${trigger.storage.type === "documentRepository" ? (selectedRepository?.name ?? t("labelNotConfigured")) : t("labelFolder")} · /${trigger.folder}`
          }
        >
          {trigger.type === "time" ? (
            <p>{t("descriptionSchedule")}</p>
          ) : (
            <>
              <p>
                {trigger.events
                  .map((event) => t(`options.${event}`))
                  .join(", ")}
              </p>
              <p>
                {t(
                  trigger.includeSubfolders
                    ? "labelSubfolders"
                    : "labelOnlyFolder",
                )}
              </p>
              <p>{t(`options.${trigger.attachment}`)}</p>
            </>
          )}
        </InfoSection>
        <InfoSection
          icon={Clock}
          title={t("labelNextRun")}
          summary={
            <AutomationNextRun automation={automation} showTimezone={false} />
          }
          editPath={editPath("trigger")}
          changed={changed("trigger") || changed("enabled")}
        >
          <p>{t("descriptionNextRun")}</p>
        </InfoSection>
        <InfoSection
          icon={BotMessageSquare}
          title={t("labelAgent")}
          summary={agent?.name ?? t("labelNotConfigured")}
          editPath={editPath("chat")}
          changed={changed("agentId")}
        >
          {agent ? (
            <>
              {agent.description && <p>{agent.description}</p>}
              <Button
                nativeButton={false}
                render={<Link href={`/agent/${agent.id}`} />}
                size="xs"
                variant="outline"
                className="no-underline!"
              >
                <BotMessageSquare /> {t("labelGoToAgent")}
              </Button>
            </>
          ) : (
            <p>{t("labelNotConfigured")}</p>
          )}
        </InfoSection>
        <InfoSection
          icon={MessageSquare}
          title={t("labelMessage")}
          editPath={editPath("chat")}
          changed={changed("message")}
        >
          <pre className="break-words whitespace-pre-wrap">
            {automation.message || t("labelNotConfigured")}
          </pre>
        </InfoSection>
      </div>
    </ContainerMain>
  );
}

function InfoSection({
  icon: Icon,
  title,
  summary,
  editPath,
  changed,
  children,
}: {
  icon: LucideIcon;
  title: string;
  summary?: ReactNode;
  editPath?: string;
  changed?: boolean;
  children: ReactNode;
}) {
  const { t } = useT("automation");
  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Icon />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {title}
          </CollapsibleTrigger>
          <InfoActions>
            {changed && <Badge>{t("labelChanged")}</Badge>}
            {editPath && (
              <Button
                nativeButton={false}
                render={<Link href={editPath} />}
                size="icon-xs"
                variant="ghost"
                aria-label={t("labelEdit")}
              >
                <Pencil />
              </Button>
            )}
            <CollapsibleTrigger
              aria-label={t("labelToggleDetails", { name: title })}
              render={
                <Button type="button" size="icon-xs" variant="ghost">
                  <ChevronsUpDown />
                </Button>
              }
            />
          </InfoActions>
        </InfoTitle>
        {summary && (
          <AlertDescription>
            <strong>{summary}</strong>
          </AlertDescription>
        )}
        <CollapsibleContent>
          <AlertDescription className="pt-3">{children}</AlertDescription>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
  );
}
