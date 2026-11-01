"use client";

import { SlidersHorizontal } from "lucide-react";
import { useT } from "next-i18next/client";
import type { useGroupSortView } from "@/lib/groupSortView/hook";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";

type List = Pick<
  ReturnType<typeof useGroupSortView<unknown, string, string, string>>,
  | "group"
  | "sort"
  | "view"
  | "setGroup"
  | "setSort"
  | "setView"
  | "isUserPreferences"
  | "savePreferences"
  | "resetPreferences"
  | "savePreferencesIsPending"
  | "savePreferencesHasErrored"
  | "savePreferencesHasSucceeded"
>;
type Choice = { value: string; label: string };

export function ResourceListOptionsDropdown({
  list,
  groups,
  sorts,
  views,
}: {
  list: List;
  groups: Choice[];
  sorts: Choice[];
  views: Choice[];
}) {
  const { t } = useT("settings", { keyPrefix: "resourceList" });
  const controls = [
    {
      label: t("labelSort"),
      value: list.sort,
      change: list.setSort,
      items: sorts,
    },
    {
      label: t("labelGroup"),
      value: list.group,
      change: list.setGroup,
      items: groups,
    },
    {
      label: t("labelView"),
      value: list.view,
      change: list.setView,
      items: views,
    },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" />}>
        <SlidersHorizontal />
        <span className="sr-only sm:not-sr-only">{t("labelOptions")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("labelView")}</DropdownMenuLabel>
          {controls.map((control) => (
            <DropdownMenuSub key={control.label}>
              <DropdownMenuSubTrigger>{control.label}</DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={control.value ?? ""}
                    onValueChange={(value) => control.change(String(value))}
                  >
                    {control.items.map((item) => (
                      <DropdownMenuRadioItem
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
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
                isPending={list.savePreferencesIsPending}
                hasErrored={list.savePreferencesHasErrored}
                hasSucceeded={list.savePreferencesHasSucceeded}
              >
                {t("labelSaveView")}
              </ButtonAction>
              <Button
                size="xs"
                variant="outline"
                onClick={list.resetPreferences}
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
