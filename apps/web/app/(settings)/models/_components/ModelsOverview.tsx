"use client";
import {
  Brain,
  Cloud,
  Search,
  SlidersHorizontal,
  CirclePlus,
} from "lucide-react";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { ModelCard } from "./ModelCard";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@schornio/aibox-package-ui/components/empty";
import type { ModelSummary } from "../modelSummary";
import { AddExternalModel } from "./AddExternalModel";

import { Fragment } from "react";
import {
  NO_GROUP_KEY,
  toKey,
  useGroupSortView,
} from "@/lib/groupSortView/hook";
import type { Preferences } from "@/lib/groupSortView/types";
import { useFilter } from "@/lib/useFilter";
import {
  HeaderMain,
  HeaderMainContent,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@schornio/aibox-package-ui/components/dropdown-menu";

export function ModelsOverview({
  models,
  userPreferences,
}: {
  models: ModelSummary[];
  userPreferences?: Preferences;
}) {
  const { t } = useT("settings", { keyPrefix: "models" });
  const { t: optionsT } = useT("agent", {
    keyPrefix: "_components.AgentListOptionsDropdown",
  });
  const { filter, setFilter, filteredData } = useFilter(models, {
    keys: ["name", "description", "identifier", "modelId"],
  });
  const modelType = (model: ModelSummary) =>
    model.type === "external_llm_v1" ? "ollama_llm_v1" : model.type;
  const origin = (model: ModelSummary) =>
    model.type === "external_llm_v1" ? "external" : "internal";
  const typeLabel = (model: ModelSummary) => t(`types.${modelType(model)}`);
  const originLabel = (model: ModelSummary) =>
    t(
      origin(model) === "external"
        ? "labelExternalOrigin"
        : "labelInternalOrigin",
    );
  const list = useGroupSortView<
    ModelSummary,
    "type" | "origin" | "first-letter" | "no-group",
    "name",
    "cards" | "table"
  >(
    "/models",
    filteredData,
    {
      group: (group, model) =>
        group === "type"
          ? modelType(model)
          : group === "origin"
            ? origin(model)
            : group === "first-letter"
              ? model.name.trim().charAt(0).toUpperCase()
              : NO_GROUP_KEY,
      groupSort: (_group, a, b) => a.localeCompare(b),
      sort: (_sort, a, b) => a.name.localeCompare(b.name),
    },
    userPreferences,
    { group: "no-group", sort: "name:asc", view: "cards" },
  );
  const groupLabel = (key: string | symbol) =>
    list.group === "type"
      ? t(`types.${String(key)}`)
      : list.group === "origin"
        ? t(key === "external" ? "labelExternalOrigin" : "labelInternalOrigin")
        : String(key);
  const controls = [
    {
      label: optionsT("labelSort"),
      value: list.sort,
      change: list.setSort,
      items: [
        ["name:asc", optionsT("labelNameAsc")],
        ["name:desc", optionsT("labelNameDesc")],
      ],
    },
    {
      label: optionsT("labelGroup"),
      value: list.group,
      change: list.setGroup,
      items: [
        ["no-group", optionsT("labelNoGroup")],
        ["type", t("labelType")],
        ["origin", t("labelOrigin")],
        ["first-letter", optionsT("labelFirstLetter")],
      ],
    },
    {
      label: optionsT("labelView"),
      value: list.view,
      change: list.setView,
      items: [
        ["cards", optionsT("labelCards")],
        ["table", optionsT("labelTable")],
      ],
    },
  ];
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Brain />
          {t("labelTitle")}
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" />}>
              <SlidersHorizontal />
              <span className="sr-only sm:not-sr-only">
                {optionsT("labelOptions")}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{optionsT("labelView")}</DropdownMenuLabel>
                {controls.map((control) => (
                  <DropdownMenuSub key={control.label}>
                    <DropdownMenuSubTrigger>
                      {control.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                          value={control.value ?? ""}
                          onValueChange={(value) =>
                            control.change(String(value))
                          }
                        >
                          {control.items.map(([value, label]) => (
                            <DropdownMenuRadioItem key={value} value={value}>
                              {label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                ))}
                {!list.isUserPreferences && (
                  <div className="flex flex-col gap-1 py-1">
                    <ButtonAction
                      size="xs"
                      onClick={list.savePreferences}
                      hasErrored={list.savePreferencesHasErrored}
                      hasSucceeded={list.savePreferencesHasSucceeded}
                      isPending={list.savePreferencesIsPending}
                    >
                      {optionsT("labelSaveView")}
                    </ButtonAction>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={list.resetPreferences}
                    >
                      {optionsT("labelReset")}
                    </Button>
                  </div>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link href="/models/new" />}>
                  <CirclePlus /> {t("labelAdd")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </HeaderMainAsideContent>
      </HeaderMain>
      <ContainerMain className="flex justify-center">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            aria-label={t("labelSearch")}
            placeholder={t("labelSearch")}
            value={filter}
            onChange={(event) => setFilter(event.currentTarget.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </ContainerMain>
      {list.itemGroups.length === 0 ? (
        <ContainerMain>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("labelNoModels")}</EmptyTitle>
              <EmptyDescription>
                {t(
                  models.length
                    ? "descriptionNoResults"
                    : "descriptionNoModels",
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ContainerMain>
      ) : list.view === "table" ? (
        <ContainerMain>
          <ContainerTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.name")}</TableHead>
                  <TableHead>{t("labelType")}</TableHead>
                  <TableHead>{t("labelOrigin")}</TableHead>
                  <TableHead>{t("labelIdentifier")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.itemGroups.map(([key, items]) => (
                  <Fragment key={toKey(key)}>
                    {key !== NO_GROUP_KEY && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-muted font-medium">
                          {groupLabel(key)}
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>
                          <Link
                            className="flex items-center gap-2"
                            href={`/models/${encodeURIComponent(model.id)}`}
                          >
                            <Brain className="size-4 shrink-0" />
                            {model.name}
                          </Link>
                        </TableCell>
                        <TableCell>{typeLabel(model)}</TableCell>
                        <TableCell>{originLabel(model)}</TableCell>
                        <TableCell>
                          {model.modelId || model.identifier}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </ContainerTable>
        </ContainerMain>
      ) : (
        <ContainerMain>
          <div className="mx-auto grid w-fit grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {list.itemGroups.map(([key, items]) => (
              <Fragment key={toKey(key)}>
                {key !== NO_GROUP_KEY && (
                  <h2 className="text-lg font-bold lg:col-span-2 xl:col-span-3">
                    {groupLabel(key)}
                  </h2>
                )}
                {items.map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </Fragment>
            ))}
          </div>
        </ContainerMain>
      )}
      <ContainerMain className="mt-10 flex flex-col items-center gap-4">
        <section
          aria-label="schorn.ai Cloud"
          className="bg-background shadow-primary/25 w-full max-w-xl rounded-xl border p-6 shadow-[0_0_32px_-8px]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <Cloud aria-hidden="true" className="text-primary size-5" />
              schorn.ai Cloud
            </h2>
            <Badge variant="secondary">{t("labelComingSoon")}</Badge>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            {t("descriptionCloud")}
          </p>
        </section>
        <AddExternalModel />
      </ContainerMain>
    </>
  );
}
