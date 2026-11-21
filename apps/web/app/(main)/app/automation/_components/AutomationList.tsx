"use client";
import { Fragment } from "react";
import { useT } from "next-i18next/client";
import { Search } from "lucide-react";
import { NO_GROUP_KEY, toKey } from "@/lib/groupSortView/hook";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@schornio/aibox-package-ui/components/input-group";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@schornio/aibox-package-ui/components/empty";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
import { AutomationCard } from "./AutomationCard";
import { AutomationListTable } from "./AutomationListTable";
import { useAutomationList } from "./AutomationListProvider";
export function AutomationList() {
  const { t } = useT("automation");
  const { filter, setFilter, view, itemGroups, group, favorites } =
    useAutomationList();
  return (
    <>
      <ContainerMain className="flex justify-center">
        <InputGroup className="max-w-sm">
          <InputGroupInput
            aria-label={t("labelSearch")}
            placeholder={t("labelSearch")}
            value={filter ?? ""}
            onChange={(event) => setFilter(event.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </ContainerMain>
      {!itemGroups.length ? (
        <ContainerMain>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleChevronsRight />
              </EmptyMedia>
              <EmptyTitle>{t("labelEmpty")}</EmptyTitle>
              <EmptyDescription>{t("descriptionApp")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ContainerMain>
      ) : view === "table" ? (
        <AutomationListTable />
      ) : (
        <div className="mx-auto grid w-fit max-w-full grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {itemGroups.map(([key, items]) => (
            <Fragment key={toKey(key)}>
              {key !== NO_GROUP_KEY && (
                <h2 className="text-lg font-bold lg:col-span-2 xl:col-span-3">
                  {group === "first-letter"
                    ? String(key)
                    : t(`options.${String(key)}`)}
                </h2>
              )}
              {items.map((automation) => (
                <AutomationCard
                  key={automation.id}
                  automation={automation}
                  favorites={favorites}
                />
              ))}
            </Fragment>
          ))}
        </div>
      )}
    </>
  );
}
