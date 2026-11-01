"use client";
import { Fragment, useEffect, useState } from "react";
import { useT } from "next-i18next/client";
import { Search, Server } from "lucide-react";
import {
  machineOfflineAfterMs,
  type MachineStatus,
  type ServiceStatus,
} from "@schornio/aibox-realtime/documents/services/_schema";
import {
  NO_GROUP_KEY,
  toKey,
  useGroupSortView,
} from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import { useFilter } from "@/lib/useFilter";
import { ResourceListOptionsDropdown } from "../../_components/ResourceListOptionsDropdown";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerTable } from "@schornio/aibox-package-ui/components/container-table";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@schornio/aibox-package-ui/components/input-group";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@schornio/aibox-package-ui/components/card";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@schornio/aibox-package-ui/components/table";

function machineState(machine: MachineStatus, now: number) {
  return machine.state === "stopped"
    ? "stopped"
    : now - Date.parse(machine.receivedAt) > machineOfflineAfterMs
      ? "offline"
      : machine.state;
}
export function ServiceDashboard({
  machines,
  connected = true,
  now: fixedNow,
  userPreferences,
}: {
  machines: MachineStatus[];
  connected?: boolean;
  now?: number;
  userPreferences?: Preferences;
}) {
  const { t, i18n } = useT("settings", { keyPrefix: "service" });
  const { t: optionsT } = useT("settings", { keyPrefix: "resourceList" });
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    if (fixedNow !== undefined) return;
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [fixedNow]);
  const now = fixedNow ?? clock;
  const locale = i18n.language;
  const number = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const bytes = (value: number) => {
    const unit =
      value >= 1024 ** 3 ? "GiB" : value >= 1024 ** 2 ? "MiB" : "KiB";
    return `${number(value / (unit === "GiB" ? 1024 ** 3 : unit === "MiB" ? 1024 ** 2 : 1024))} ${unit}`;
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  const percent = (value: number | null) =>
    value === null ? t("labelUnavailable") : `${number(value)} %`;
  const capacity = (value: { used: number; total: number } | null) =>
    value
      ? t("labelCapacity", {
          used: bytes(value.used),
          total: bytes(value.total),
        })
      : t("labelUnavailable");

  const { filter, setFilter, filteredData } = useFilter(machines, {
    keys: ["name", "platform", "roles", "services.name"],
  });
  const list = useGroupSortView<
    MachineStatus,
    "state" | "platform" | "role" | "first-letter" | "no-group",
    "name" | "receivedAt" | "cpu" | "memory",
    "cards" | "table"
  >(
    "/service",
    filteredData,
    {
      group: (group, machine) => {
        switch (group) {
          case "state":
            return machineState(machine, now);
          case "platform":
            return machine.platform;
          case "role":
            return new Set(machine.roles);
          case "first-letter":
            return machine.name.trim().charAt(0).toUpperCase();
          default:
            return NO_GROUP_KEY;
        }
      },
      groupSort: (_group, a, b) => a.localeCompare(b),
      sort: (sort, a, b) => {
        switch (sort) {
          case "receivedAt":
            return a.receivedAt.localeCompare(b.receivedAt);
          case "cpu":
            return (a.metrics.cpuPercent ?? -1) - (b.metrics.cpuPercent ?? -1);
          case "memory":
            return a.metrics.memory.used - b.metrics.memory.used;
          default:
            return a.name.localeCompare(b.name);
        }
      },
    },
    userPreferences,
    { group: "no-group", sort: "name:asc", view: "cards" },
  );
  const groupLabel = (key: string | symbol) =>
    key === NO_GROUP_KEY
      ? t("labelNoRoles")
      : list.group === "state"
        ? t(`state.${String(key)}`)
        : String(key);
  const grouped = list.group && list.group !== "no-group";
  const serviceLabel = (service: ServiceStatus, offline: boolean) =>
    `${offline ? t("labelLastKnown", { state: t(`state.${service.state}`) }) : t(`state.${service.state}`)}${service.health ? ` · ${t(`health.${service.health}`)}` : ""}`;
  const syncLabel = (machine: MachineStatus) =>
    `${t("labelSyncStatus", { state: t(`sync.${machine.sync.state}`) })}${machine.sync.lastSuccessAt ? ` · ${date(machine.sync.lastSuccessAt)}` : ""}`;
  const renderCard = (machine: MachineStatus) => {
    const offline =
      now - Date.parse(machine.receivedAt) > machineOfflineAfterMs;
    const state = machineState(machine, now);
    return (
      <Card key={machine.id}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{machine.name}</span>
            <Badge variant={state === "running" ? "secondary" : "outline"}>
              {t(`state.${state}`)}
            </Badge>
          </CardTitle>
          <CardDescription>
            {machine.platform} · {machine.roles.join(", ") || t("labelNoRoles")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-muted-foreground">{t("labelCpu")}</dt>
              <dd>{percent(machine.metrics.cpuPercent)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("labelMemory")}</dt>
              <dd>{capacity(machine.metrics.memory)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("labelGpu")}</dt>
              <dd>
                {machine.metrics.gpus.length
                  ? machine.metrics.gpus
                      .map(
                        (gpu) =>
                          `${gpu.name}: ${percent(gpu.utilizationPercent)}`,
                      )
                      .join(" · ")
                  : t("labelUnavailable")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("labelDisk")}</dt>
              <dd>{capacity(machine.metrics.disk)}</dd>
            </div>
          </dl>
          {machine.services.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("labelService")}</TableHead>
                  <TableHead>{t("labelStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machine.services.map((service) => (
                  <TableRow key={service.name}>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>
                      {offline
                        ? t("labelLastKnown", {
                            state: t(`state.${service.state}`),
                          })
                        : t(`state.${service.state}`)}
                      {service.health
                        ? ` · ${t(`health.${service.health}`)}`
                        : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-1 text-xs">
          <span>{t("labelLastSeen", { date: date(machine.receivedAt) })}</span>
          <span>
            {t("labelSyncStatus", {
              state: t(`sync.${machine.sync.state}`),
            })}
            {machine.sync.lastSuccessAt
              ? ` · ${date(machine.sync.lastSuccessAt)}`
              : ""}
          </span>
        </CardFooter>
      </Card>
    );
  };
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Server />
          {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <ResourceListOptionsDropdown
            list={list}
            groups={[
              { value: "no-group", label: optionsT("labelNoGroup") },
              { value: "state", label: t("labelStatus") },
              { value: "platform", label: t("labelPlatform") },
              { value: "role", label: t("labelRoles") },
              { value: "first-letter", label: optionsT("labelFirstLetter") },
            ]}
            sorts={[
              { value: "name:asc", label: optionsT("labelNameAsc") },
              { value: "name:desc", label: optionsT("labelNameDesc") },
              { value: "receivedAt:desc", label: t("labelSeenNewest") },
              { value: "receivedAt:asc", label: t("labelSeenOldest") },
              { value: "cpu:desc", label: t("labelCpuHighest") },
              { value: "memory:desc", label: t("labelMemoryHighest") },
            ]}
            views={[
              { value: "cards", label: optionsT("labelCards") },
              { value: "table", label: optionsT("labelTable") },
            ]}
          />
        </HeaderMainAsideContent>
      </HeaderMain>
      <ContainerMain className="flex flex-col gap-6">
        {!connected && (
          <Alert>
            <AlertDescription>{t("descriptionDisconnected")}</AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground text-sm">
          {t("descriptionMachines")}
        </p>
        <div className="flex justify-center">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              aria-label={t("labelSearch")}
              placeholder={t("labelSearch")}
              value={filter ?? ""}
              onChange={(event) => setFilter(event.currentTarget.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
        {list.itemGroups.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Server />
              </EmptyMedia>
              <EmptyTitle>
                {machines.length
                  ? optionsT("labelNoResults")
                  : t("labelNoMachines")}
              </EmptyTitle>
              <EmptyDescription>
                {machines.length
                  ? optionsT("descriptionNoResults")
                  : t("descriptionNoMachines")}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : list.view === "table" ? (
          <ContainerTable>
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "labelName",
                    "labelStatus",
                    "labelServices",
                    "labelCpu",
                    "labelGpu",
                    "labelMemory",
                    "labelDisk",
                    "labelSeen",
                  ].map((key) => (
                    <TableHead key={key}>{t(key)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.itemGroups.map(([key, items]) => (
                  <Fragment key={toKey(key)}>
                    {grouped && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted font-medium">
                          {groupLabel(key)}
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((machine) => {
                      const state = machineState(machine, now);
                      const offline =
                        now - Date.parse(machine.receivedAt) >
                        machineOfflineAfterMs;
                      return (
                        <TableRow key={machine.id}>
                          <TableCell>
                            <div>{machine.name}</div>
                            <div className="text-muted-foreground text-xs">
                              {machine.platform} ·{" "}
                              {machine.roles.join(", ") || t("labelNoRoles")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                state === "running" ? "secondary" : "outline"
                              }
                            >
                              {t(`state.${state}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {machine.services.map((service) => (
                                <span key={service.name}>
                                  {service.name}:{" "}
                                  {serviceLabel(service, offline)}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {percent(machine.metrics.cpuPercent)}
                          </TableCell>
                          <TableCell>
                            {machine.metrics.gpus.length
                              ? machine.metrics.gpus.map((gpu) => (
                                  <div key={gpu.name}>
                                    {gpu.name}:{" "}
                                    {percent(gpu.utilizationPercent)}
                                  </div>
                                ))
                              : t("labelUnavailable")}
                          </TableCell>
                          <TableCell>
                            {capacity(machine.metrics.memory)}
                          </TableCell>
                          <TableCell>
                            {capacity(machine.metrics.disk)}
                          </TableCell>
                          <TableCell>
                            <div>{date(machine.receivedAt)}</div>
                            <div className="text-muted-foreground text-xs">
                              {syncLabel(machine)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </ContainerTable>
        ) : (
          list.itemGroups.map(([key, items]) => (
            <section key={toKey(key)} className="flex flex-col gap-3">
              {grouped && (
                <h2 className="text-lg font-semibold">{groupLabel(key)}</h2>
              )}
              <div className="grid gap-3 xl:grid-cols-2">
                {items.map(renderCard)}
              </div>
            </section>
          ))
        )}
      </ContainerMain>
    </>
  );
}
