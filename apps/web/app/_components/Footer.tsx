"use client";

import { Languages, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { useChangeLanguage, useT } from "next-i18next/client";
import { useEffect, useState } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import Link from "next/link";
import { LogoSchornAI } from "@schornio/aibox-package-ui/components/logo-schornai";
import { useTheme } from "next-themes";
import { fallbackLanguage, languages } from "../../lib/languages";

export function Footer() {
  const { t, i18n } = useT(undefined, { useSuspense: false });
  const changeLanguage = useChangeLanguage();

  const { setTheme, resolvedTheme } = useTheme();
  const [hydrationSafeResolvedTheme, setHydrationSafeResolvedTheme] =
    useState<typeof resolvedTheme>("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrationSafeResolvedTheme(resolvedTheme);
  }, [resolvedTheme]);

  return (
    <footer className="bg-muted">
      <hr />
      <div className="flex flex-col-reverse items-center justify-between gap-3 px-5 py-1 lg:flex-row">
        <div className="flex items-end gap-2">
          <Link href="/">
            <LogoSchornAI className="text-muted-foreground w-20" />
          </Link>
          <span className="text-muted-foreground text-xs">November 2026</span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="max-lg:grid max-lg:w-full max-lg:grid-cols-2 lg:flex">
            {/* <Button
              nativeButton={false}
              render={
                <Link href="https://schorn.ai/docs" target="_blank">
                  {t("footer.docs")}
                </Link>
              }
              variant="ghost"
            /> */}
            {/* <Button
            nativeButton={false}
            render={
              <Link href="https://schorn.ai/help" target="_blank">
                {t("footer.help")} max-lg:grid-cols-2 --> max-lg:grid-cols-3
              </Link>
            }
            variant="ghost"
          /> */}
            <Button
              nativeButton={false}
              render={
                <Link className="relative" href="/feedback">
                  {t("footer.feedback")}
                </Link>
              }
              variant="ghost"
            />
          </div>
          <div className="gap-3 max-lg:grid max-lg:w-full max-lg:grid-cols-2 lg:flex">
            <Select
              onValueChange={(value) =>
                void changeLanguage(value ?? fallbackLanguage)
              }
              value={i18n.resolvedLanguage ?? i18n.language}
            >
              <SelectTrigger
                className="w-full"
                aria-label={t("footer.labelLanguage")}
              >
                <Languages />
                <span className="lg:hidden">
                  {
                    languages.find(
                      ({ code }) =>
                        code === (i18n.resolvedLanguage ?? i18n.language),
                    )?.name
                  }
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {languages.map(({ code, name }) => (
                    <SelectItem key={code} value={code}>
                      <bdi lang={code}>{name}</bdi>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) => void setTheme(value as string)}
              value={hydrationSafeResolvedTheme}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  <Sun className="block dark:hidden" />
                  <Moon className="hidden dark:flex" />
                  <span className="block lg:hidden dark:hidden">
                    {t("footer.labelThemeLight")}
                  </span>
                  <span className="hidden max-lg:dark:flex">
                    {t("footer.labelThemeDark")}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="light">
                    {t("footer.labelThemeLight")}
                  </SelectItem>
                  <SelectItem value="dark">
                    {t("footer.labelThemeDark")}
                  </SelectItem>
                  <SelectItem value="system">
                    {t("footer.labelThemeSystem")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </footer>
  );
}
