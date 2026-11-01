"use client";

import { useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TabsSub } from "../../../../_components/Tabs";
import { TabsMainList } from "../../../../_components/TabsMain";
import {
  ArrowDownToLine,
  Image,
  LayoutDashboard,
  Palette,
  Paintbrush,
  Type,
} from "lucide-react";
import { useT } from "next-i18next/client";
import { useAction } from "next-safe-action/hooks";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ThemeEditorDiscardChanges } from "./ThemeEditorDiscardChanges";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  FieldError,
  FieldGroup,
} from "@schornio/aibox-package-ui/components/field";
import {
  TabsList,
  TabsTrigger,
} from "@schornio/aibox-package-ui/components/tabs";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import type { Theme } from "@/lib/theme";
import {
  normalizeThemeSettings,
  normalizeWelcomeMessage,
} from "@/lib/themeSettings";
import { updateThemeSettings } from "../_actions/updateThemeSettings";
import { themeEditorSettingsSchema } from "@/lib/themeEditorSettings";

import { ThemeColorsTab } from "./ThemeColorsTab";
import { ThemeLogosTab } from "./ThemeLogosTab";
import { ThemeOverviewTab } from "./ThemeOverviewTab";
import { ThemeTextTab } from "./ThemeTextTab";
import type { AccessMessageTemplates } from "@/lib/accessMessage";

export function ThemeEditor({
  defaultAccessMessage,
  defaultTheme,
  defaultWelcomeMessage,
}: {
  defaultAccessMessage?: AccessMessageTemplates;
  defaultTheme: Theme;
  defaultWelcomeMessage?: Record<string, string>;
}) {
  const { t: tPage } = useT("settings", { keyPrefix: "theme.page" });
  const formId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const tab =
    view === "logos" || view === "texts" || view === "colors"
      ? view
      : "default";
  const editTab = (view: "logos" | "texts" | "colors") => {
    const params = new URLSearchParams(searchParams);
    params.set("view", view);
    router.push(`${pathname}?${params}`, { scroll: false });
  };
  const [welcomeMessage, setWelcomeMessage] = useState(
    normalizeWelcomeMessage(defaultWelcomeMessage ?? {}),
  );
  const { t } = useT("settings", {
    keyPrefix: "_components.ThemeEditor",
  });
  const [savedWelcomeMessage, setSavedWelcomeMessage] = useState(
    normalizeWelcomeMessage(defaultWelcomeMessage ?? {}),
  );
  const [accessMessage, setAccessMessage] = useState(
    defaultAccessMessage ?? {},
  );
  const [savedAccessMessage, setSavedAccessMessage] = useState(
    defaultAccessMessage ?? {},
  );
  const [uploadingLanguages, setUploadingLanguages] = useState<string[]>([]);
  const [theme, setTheme] = useState(defaultTheme);
  const [savedTheme, setSavedTheme] = useState(defaultTheme);
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateThemeSettings, {
    ...actionUtils,
    onSuccess: ({ input }) => {
      setTheme(input.theme);
      setSavedTheme(input.theme);
      setWelcomeMessage(input.welcomeMessage);
      setSavedWelcomeMessage(input.welcomeMessage);
      setAccessMessage(input.accessMessage);
      setSavedAccessMessage(input.accessMessage);
      actionUtils.onSuccess();
    },
  });
  const isBusy = isPending || uploadingLanguages.length > 0;
  const hasIncompleteLogo = Object.values(theme.logo ?? {}).some(
    (logo) => !logo.url.trim(),
  );
  const normalizedTheme = normalizeThemeSettings(theme);
  const settings = { theme, welcomeMessage, accessMessage };
  const savedSettings = {
    theme: savedTheme,
    welcomeMessage: savedWelcomeMessage,
    accessMessage: savedAccessMessage,
  };
  const validation = themeEditorSettingsSchema.safeParse({
    ...settings,
    theme: normalizedTheme,
    welcomeMessage: normalizeWelcomeMessage(welcomeMessage),
  });
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Paintbrush /> {tPage("labelTitle")}
          <ThemeEditorDiscardChanges
            settings={settings}
            savedSettings={savedSettings}
            disabled={isBusy}
            onDiscard={() => {
              setTheme(savedTheme);
              setWelcomeMessage(savedWelcomeMessage);
              setAccessMessage(savedAccessMessage);
            }}
          />
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <TabsSub searchParamsKey="view" value={tab} className="gap-5">
          <TabsMainList stickyTop>
            <TabsList className="contents">
              <TabsTrigger value="default">
                <LayoutDashboard /> {t("labelOverview")}
              </TabsTrigger>
              <TabsTrigger value="logos">
                <Image /> {t("labelTabLogo")}
              </TabsTrigger>
              <TabsTrigger value="texts">
                <Type /> {t("labelWelcome")}
              </TabsTrigger>
              <TabsTrigger value="colors">
                <Palette /> {t("labelTabColors")}
              </TabsTrigger>
            </TabsList>
            <ButtonAction
              type="submit"
              form={formId}
              size="sm"
              disabled={
                !hasChanges ||
                !validation.success ||
                hasIncompleteLogo ||
                isBusy
              }
              isPending={isPending}
              hasErrored={hasErrored}
              hasSucceeded={hasSucceeded}
            >
              <ArrowDownToLine data-icon="inline-start" />
              {t("labelSave")}
            </ButtonAction>
          </TabsMainList>
          <form
            id={formId}
            onSubmit={(event) => {
              event.preventDefault();
              if (
                validation.success &&
                hasChanges &&
                !isBusy &&
                !hasIncompleteLogo
              )
                execute(validation.data);
            }}
          >
            <FieldGroup>
              <ThemeOverviewTab
                theme={theme}
                savedTheme={savedTheme}
                welcomeMessage={welcomeMessage}
                savedWelcomeMessage={savedWelcomeMessage}
                onEdit={editTab}
              />

              <ThemeColorsTab
                theme={theme}
                setTheme={setTheme}
                isBusy={isBusy}
              />
              <ThemeLogosTab
                theme={theme}
                setTheme={setTheme}
                isBusy={isBusy}
                setUploadingLanguages={setUploadingLanguages}
              />
              <ThemeTextTab
                welcomeMessage={welcomeMessage}
                onWelcomeMessageChange={setWelcomeMessage}
                accessMessage={accessMessage}
                onAccessMessageChange={setAccessMessage}
                disabled={isBusy}
              />
              {!validation.success && (
                <FieldError role="alert">{t("errorValidation")}</FieldError>
              )}
              {hasErrored && (
                <FieldError role="alert">{t("errorSave")}</FieldError>
              )}
            </FieldGroup>
          </form>
        </TabsSub>
      </ContainerMain>
    </>
  );
}
