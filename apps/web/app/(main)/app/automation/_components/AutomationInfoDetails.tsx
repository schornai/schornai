"use client";
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
  type LucideIcon,
} from "lucide-react";
import { useT } from "next-i18next/client";
import type { AutomationInput } from "@schornio/aibox-package-database/automation/_schemas";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoTitle } from "../../../../_components/InfoTitle";
import { InfoActions } from "../../../../_components/InfoActions";
import { AutomationNextRun, type AutomationDisplay } from "./AutomationNextRun";

type DetailProps = {
  automation: AutomationDisplay;
  original?: AutomationInput;
  editHref?: string;
};
export function AutomationInfoTrigger({
  automation,
  original,
  editHref,
  repositories = [],
}: DetailProps & { repositories?: DocumentRepository[] }) {
  const { t, i18n } = useT("automation");
  const triggerChanged = Boolean(
    original &&
    JSON.stringify(original.trigger) !== JSON.stringify(automation.trigger),
  );
  const trigger = automation.trigger;
  const repositoryId =
    trigger.type === "storage" && trigger.storage.type === "documentRepository"
      ? trigger.storage.documentRepositoryId
      : undefined;
  const selectedRepository = repositories.find(
    (repo) => repo.id === repositoryId,
  );
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
    <>
      <AutomationInfoSection
        icon={Zap}
        title={t("labelTrigger")}
        editPath={editHref}
        changed={triggerChanged}
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
              {trigger.events.map((event) => t(`options.${event}`)).join(", ")}
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
      </AutomationInfoSection>
      <AutomationInfoSection
        icon={Clock}
        title={t("labelNextRun")}
        summary={
          <AutomationNextRun automation={automation} showTimezone={false} />
        }
        editPath={editHref}
        changed={
          triggerChanged ||
          Boolean(original && original.enabled !== automation.enabled)
        }
      >
        <p>{t("descriptionNextRun")}</p>
      </AutomationInfoSection>
    </>
  );
}
export function AutomationInfoChat({
  automation,
  original,
  editHref,
  agents = [],
}: DetailProps & { agents?: Agent[] }) {
  const { t } = useT("automation");
  const agent = agents.find((agent) => agent.id === automation.agentId);
  return (
    <>
      <AutomationInfoSection
        icon={BotMessageSquare}
        title={t("labelAgent")}
        summary={agent?.name ?? t("labelNotConfigured")}
        editPath={editHref}
        changed={Boolean(original && original.agentId !== automation.agentId)}
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
      </AutomationInfoSection>
      <AutomationInfoSection
        icon={MessageSquare}
        title={t("labelMessage")}
        editPath={editHref}
        changed={Boolean(original && original.message !== automation.message)}
      >
        <pre className="break-words whitespace-pre-wrap">
          {automation.message || t("labelNotConfigured")}
        </pre>
      </AutomationInfoSection>
    </>
  );
}
export function AutomationInfoSection({
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
