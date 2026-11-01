"use client";

import { CirclePlus, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import { useAgentList } from "./AgentListProvider";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentListOptionsDropdown() {
  const router = useRouter();
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
  } = useAgentList();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentListOptionsDropdown",
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
                  <DropdownMenuRadioItem value="name:asc">
                    {t("labelNameAsc")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name:desc">
                    {t("labelNameDesc")}
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
                  <DropdownMenuRadioItem value="favorite">
                    {t("labelFavorites")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="first-letter">
                    {t("labelFirstLetter")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="workspace">
                    {t("labelWorkspaces")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="model">
                    {t("labelModel")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="document-repository">
                    {t("labelRepositories")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="role-count">
                    {t("labelRoleCount")}
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
                  <DropdownMenuRadioItem value="cards">
                    {t("labelCards")}
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
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("labelAgents")}</DropdownMenuLabel>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push(`/agent/new`)}
          >
            <CirclePlus /> {t("labelNewAgent")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
