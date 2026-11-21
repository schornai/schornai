"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  MessageSquare,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useT } from "next-i18next/client";
import type {
  Automation,
  AutomationRun,
} from "@schornio/aibox-package-database/automation/_types";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@schornio/aibox-package-ui/components/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import {
  IconGroup,
  IconGroupButton,
} from "@schornio/aibox-package-ui/components/icon-group";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { useFilter } from "@/lib/useFilter";
import {
  NO_GROUP_KEY,
  toKey,
  useGroupSortView,
  type GroupSortFunctions,
} from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import { AutomationDetailHeader } from "./AutomationDetailHeader";

const functions: GroupSortFunctions<AutomationRun, "state", "created"> = {
  group: (group, run) => (group === "state" ? run.state : NO_GROUP_KEY),
  groupSort: (_, a, b) => a.localeCompare(b),
  sort: (_, a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
};

export function AutomationRuns({
  automation,
  runs,
  userPreferences = {},
}: {
  automation: Automation;
  runs: AutomationRun[];
  userPreferences?: Preferences;
}) {
  const { t, i18n } = useT("automation");
  // Match the server snapshot before switching to the viewer's device timezone.
  const [timezone, setTimezone] = useState("UTC");
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  const formatter = new Intl.DateTimeFormat(
    i18n.resolvedLanguage ?? i18n.language ?? "de",
    { dateStyle: "medium", timeStyle: "medium", timeZone: timezone },
  );
  const { filter, setFilter, filteredData } = useFilter(
    runs.map((run) => ({
      ...run,
      stateLabel: t(`states.${run.state}`),
      createdLabel: formatter.format(new Date(run.created_at)),
      finishedLabel: run.finished_at
        ? formatter.format(new Date(run.finished_at))
        : "",
    })),
    { keys: ["stateLabel", "createdLabel", "finishedLabel"] },
  );
  const list = useGroupSortView<AutomationRun, "state", "created", "table">(
    "/app/automation/runs",
    filteredData,
    functions,
    userPreferences,
    { sort: "created:desc", view: "table" },
  );
  return (
    <>
      <AutomationDetailHeader
        automation={automation}
        view="runs"
        options={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" />}>
              <SlidersHorizontal />
              <span className="sr-only sm:not-sr-only">
                {t("labelOptions")}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("labelSort")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={list.sort ?? ""}
                  onValueChange={(value) => list.setSort(String(value))}
                >
                  <DropdownMenuRadioItem value="created:desc">
                    {t("labelNewestFirst")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="created:asc">
                    {t("labelOldestFirst")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("labelGroup")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={list.group ?? "no-group"}
                  onValueChange={(value) => list.setGroup(String(value))}
                >
                  <DropdownMenuRadioItem value="no-group">
                    {t("labelNoGroup")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="state">
                    {t("labelStatus")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              {!list.isUserPreferences && (
                <div className="flex flex-col gap-1 py-1">
                  <ButtonAction
                    size="xs"
                    onClick={() => list.savePreferences()}
                    isPending={list.savePreferencesIsPending}
                    hasErrored={list.savePreferencesHasErrored}
                    hasSucceeded={list.savePreferencesHasSucceeded}
                  >
                    {t("labelSaveView")}
                  </ButtonAction>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => list.resetPreferences()}
                  >
                    {t("labelReset")}
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <ContainerMain className="flex justify-center">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            aria-label={t("labelSearchRuns")}
            placeholder={t("labelSearchRuns")}
            value={filter ?? ""}
            onChange={(event) => setFilter(event.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </ContainerMain>
      <ContainerMain>
        <ContainerTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("labelCreatedAt")}</TableHead>
                <TableHead>{t("labelFinishedAt")}</TableHead>
                <TableHead>{t("labelStatus")}</TableHead>
                <TableHead className="text-right">
                  {t("labelActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!list.itemGroups.length && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <History />
                        </EmptyMedia>
                        <EmptyTitle>
                          {t(
                            runs.length ? "labelNoMatchingRuns" : "labelNoRuns",
                          )}
                        </EmptyTitle>
                        <EmptyDescription>
                          {t(
                            runs.length
                              ? "descriptionNoMatchingRuns"
                              : "descriptionNoRuns",
                          )}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
              {list.itemGroups.map(([key, group]) => (
                <Fragment key={toKey(key)}>
                  {key !== NO_GROUP_KEY && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted font-medium">
                        {t(`states.${String(key)}`)}
                      </TableCell>
                    </TableRow>
                  )}
                  {group.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="tabular-nums">
                        <time dateTime={run.created_at}>
                          {formatter.format(new Date(run.created_at))}
                        </time>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {run.finished_at ? (
                          <time dateTime={run.finished_at}>
                            {formatter.format(new Date(run.finished_at))}
                          </time>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            run.state === "failed" ? "destructive" : "outline"
                          }
                        >
                          {t(`states.${run.state}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <IconGroup className="justify-end">
                          {run.state === "queued" && (
                            <IconGroupButton
                              tooltip={t("labelOpenChat")}
                              nativeButton={false}
                              render={
                                <Link
                                  href={`/agent/${automation.agentId}/${run.activity_id}`}
                                />
                              }
                            >
                              <MessageSquare />
                            </IconGroupButton>
                          )}
                        </IconGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </ContainerTable>
        <p className="text-muted-foreground mt-3 text-sm">
          {t("descriptionRuns", { timezone })}
        </p>
      </ContainerMain>
    </>
  );
}
