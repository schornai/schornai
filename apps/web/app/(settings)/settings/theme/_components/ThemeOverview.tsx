"use client";

import type { ReactNode } from "react";
import {
  ChevronsUpDown,
  Image,
  Info,
  Palette,
  Pencil,
  Type,
} from "lucide-react";
import { useT } from "next-i18next/client";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  CardApp,
  CardAppHeader,
  CardAppMain,
  CardAppFooter,
} from "@schornio/aibox-package-ui/components/card-app";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { LogoSchornAI } from "@schornio/aibox-package-ui/components/logo-schornai";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { Separator } from "@schornio/aibox-package-ui/components/separator";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { getThemeLocalized } from "@/lib/themeLanguages";
import { InfoActions } from "../../../../_components/InfoActions";
import { InfoTitle } from "../../../../_components/InfoTitle";
import { defaultColors } from "@/lib/defaultColors";
import type { Theme } from "@/lib/theme";
import {
  isThemeLogoUrl,
  normalizeThemeSettings,
  normalizeWelcomeMessage,
} from "@/lib/themeSettings";

function ThemeOverviewSection({
  icon,
  title,
  summary,
  changed,
  editLabel,
  onEdit,
  children,
}: {
  icon: ReactNode;
  title: string;
  summary: ReactNode;
  changed: boolean;
  editLabel: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  const { t } = useT("settings", { keyPrefix: "_components.ThemeOverview" });
  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      {icon}
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {title}
          </CollapsibleTrigger>
          <InfoActions>
            {changed && <Badge>{t("labelChanged")}</Badge>}
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={editLabel}
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            <CollapsibleTrigger
              aria-label={t("labelToggleDetails", { name: title })}
              render={<Button type="button" size="icon-xs" variant="ghost" />}
            >
              <ChevronsUpDown />
            </CollapsibleTrigger>
          </InfoActions>
        </InfoTitle>
        <AlertDescription>{summary}</AlertDescription>
        <CollapsibleContent>
          <AlertDescription className="pt-3">{children}</AlertDescription>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
  );
}

export function ThemeOverview({
  theme,
  savedTheme,
  welcomeMessage,
  savedWelcomeMessage,
  onEdit,
}: {
  theme: Theme;
  savedTheme: Theme;
  welcomeMessage: Record<string, string>;
  savedWelcomeMessage: Record<string, string>;
  onEdit: (tab: "logos" | "texts" | "colors") => void;
}) {
  const { t, i18n } = useT("settings", {
    keyPrefix: "_components.ThemeOverview",
  });
  const { t: tCommon } = useT("common");
  const colors = theme.colors ?? defaultColors;
  const normalizedTheme = normalizeThemeSettings(theme);
  const normalizedWelcome = normalizeWelcomeMessage(welcomeMessage);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const logo = getThemeLocalized(normalizedTheme.logo, language);
  const text =
    getThemeLocalized(normalizedWelcome, language) ??
    tCommon("_welcomeMessage");
  const logoPreview =
    logo && isThemeLogoUrl(logo.url.trim()) ? (
      <img
        src={logo.url.trim()}
        alt={logo.alt ?? ""}
        className="h-16 max-w-full object-contain"
      />
    ) : (
      <LogoSchornAI className="text-muted-foreground h-16 max-w-full" />
    );

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[auto_1fr]">
        <CardApp className="max-w-full">
          <CardAppHeader>
            <Palette /> {t("labelAppearance")}
          </CardAppHeader>
          <CardAppMain className="justify-center p-3">
            {logoPreview}
          </CardAppMain>
          <CardAppFooter className="flex-wrap justify-center gap-1 p-2">
            {colors.map((entry) => (
              <ContainerStyled
                key={entry.id}
                appColor={entry.color}
                className="size-4 rounded-sm"
                title={entry.name}
              />
            ))}
          </CardAppFooter>
        </CardApp>
        <div className="flex min-w-0 flex-col gap-1">
          <ThemeOverviewSection
            icon={<Image />}
            title={t("labelLogo")}
            summary={logo ? t("labelCustomLogo") : t("labelDefaultLogo")}
            changed={
              JSON.stringify(theme.logo) !== JSON.stringify(savedTheme.logo)
            }
            editLabel={t("labelEditLogo")}
            onEdit={() => onEdit("logos")}
          >
            {logoPreview}
          </ThemeOverviewSection>
          <ThemeOverviewSection
            icon={<Type />}
            title={t("labelText")}
            summary={
              Object.keys(normalizedWelcome).length
                ? t("labelCustomText")
                : t("labelDefaultText")
            }
            changed={
              JSON.stringify(welcomeMessage) !==
              JSON.stringify(savedWelcomeMessage)
            }
            editLabel={t("labelEditText")}
            onEdit={() => onEdit("texts")}
          >
            <MarkdownProse className="max-w-none">{text}</MarkdownProse>
          </ThemeOverviewSection>
          <ThemeOverviewSection
            icon={<Palette />}
            title={t("labelColors")}
            summary={t("labelColorCount", { count: colors.length })}
            changed={
              JSON.stringify(theme.colors) !== JSON.stringify(savedTheme.colors)
            }
            editLabel={t("labelEditColors")}
            onEdit={() => onEdit("colors")}
          >
            <div className="flex flex-col gap-2">
              {colors.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2">
                  <ContainerStyled
                    appColor={entry.color}
                    className="h-8 w-16 shrink-0 rounded-md"
                  />
                  <span className="truncate">{entry.name}</span>
                </div>
              ))}
              {colors.length === 0 && t("descriptionEmptyColors")}
            </div>
          </ThemeOverviewSection>
        </div>
      </div>
      <Separator className="my-10" />
      <ContainerMain className="flex flex-col gap-3" size="narrow">
        <h2 title={t("labelHelp")}>
          <Info className="mx-auto" size={40} />
        </h2>
        <Alert>
          <Image />
          <AlertDescription>{t("descriptionLogo")}</AlertDescription>
        </Alert>
        <Alert>
          <Type />
          <AlertDescription>{t("descriptionText")}</AlertDescription>
        </Alert>
        <Alert>
          <Palette />
          <AlertDescription>{t("descriptionColors")}</AlertDescription>
        </Alert>
      </ContainerMain>
    </>
  );
}
