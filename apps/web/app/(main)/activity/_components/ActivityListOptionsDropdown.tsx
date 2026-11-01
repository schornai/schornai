"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { SlidersHorizontal } from "lucide-react";
import { useActivityList } from "./ActivityListProvider";
import { useT } from "next-i18next/client";

export function ActivityListOptionsDropdown() {
  const {
    group,
    isUserPreferences,
    resetPreferences,
    savePreferences,
    savePreferencesHasErrored,
    savePreferencesHasSucceeded,
    savePreferencesIsPending,
    setGroup,
    setSort,
    setView,
    sort,
    view,
  } = useActivityList();
  const { t } = useT("activity", {
    keyPrefix: "_components.ActivityListOptionsDropdown",
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" />}>
        <SlidersHorizontal />
        <span className="sr-only sm:not-sr-only">{t("labelOptions")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("labelView")}</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t("labelSort")}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={sort ?? ""}
                  onValueChange={(value) => setSort(String(value))}
                >
                  <DropdownMenuRadioItem value="label:asc">
                    {t("labelLabelAsc")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="label:desc">
                    {t("labelLabelDesc")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sort ?? ""}
                  onValueChange={(value) => setSort(String(value))}
                >
                  <DropdownMenuRadioItem value="created:asc">
                    {t("labelCreatedAsc")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="created:desc">
                    {t("labelCreatedDesc")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sort ?? ""}
                  onValueChange={(value) => setSort(String(value))}
                >
                  <DropdownMenuRadioItem value="updated:asc">
                    {t("labelUpdatedAsc")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="updated:desc">
                    {t("labelUpdatedDesc")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t("labelGroup")}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={group ?? ""}
                  onValueChange={(value) => setGroup(String(value))}
                >
                  <DropdownMenuRadioItem value="no-group">
                    {t("labelNoGroup")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioItem value="pinned">
                    {t("labelPinned")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="state">
                    {t("labelState")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="type">
                    {t("labelType")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="created">
                    {t("labelCreated")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="updated">
                    {t("labelUpdated")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t("labelView")}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={view ?? ""}
                  onValueChange={(value) => setView(String(value))}
                >
                  <DropdownMenuRadioItem value="list">
                    {t("labelList")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="table">
                    {t("labelTable")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          {isUserPreferences ? undefined : (
            <div className="flex flex-col gap-1 py-1">
              <ButtonAction
                hasErrored={savePreferencesHasErrored}
                hasSucceeded={savePreferencesHasSucceeded}
                isPending={savePreferencesIsPending}
                onClick={() => savePreferences()}
                size="xs"
              >
                {t("labelSaveView")}
              </ButtonAction>
              <Button
                onClick={() => resetPreferences()}
                size="xs"
                variant="outline"
              >
                {t("labelReset")}
              </Button>
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
