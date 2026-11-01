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
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";
import { useUserList } from "./UserListProvider";

export function UserListOptionsDropdown() {
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
    sort,
  } = useUserList();
  const { t } = useT("settings", {
    keyPrefix: "_components.UserListOptionsDropdown",
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
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sort ?? ""}
                  onValueChange={(value) => setSort(String(value))}
                >
                  <DropdownMenuRadioItem value="email:asc">
                    {t("labelEmailAsc")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="email:desc">
                    {t("labelEmailDesc")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuRadioGroup
                  value={sort ?? ""}
                  onValueChange={(value) => setSort(String(value))}
                >
                  <DropdownMenuRadioItem value="last-login:asc">
                    {t("labelLastLoginAsc")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="last-login:desc">
                    {t("labelLastLoginDesc")}
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
                  <DropdownMenuRadioItem value="first-letter">
                    {t("labelFirstLetter")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="sign-in-method">
                    {t("labelSignInMethod")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="last-login">
                    {t("labelLastLogin")}
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
          <DropdownMenuLabel>{t("labelCreateUser")}</DropdownMenuLabel>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push(`/settings/user/new`)}
          >
            <CirclePlus /> {t("labelCreateUser")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
