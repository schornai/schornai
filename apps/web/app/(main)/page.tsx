import { BotMessageSquare, Star, ToolCase } from "lucide-react";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import DashboardFavorites from "./_components/DashboardFavorites";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { getCurrentUserProfile } from "../_models/getCurrentUserProfile";
import { getThemeLocalized } from "@/lib/themeLanguages";
import { getSystemConfigWelcomeMessage } from "../_models/systemConfigWelcomeMessage";
import { getT } from "next-i18next/server";

export default async function Page() {
  const [userProfile, welcomeMessage, { t }, { lng, t: tGlobal }] =
    await Promise.all([
      getCurrentUserProfile(),
      getSystemConfigWelcomeMessage(),
      getT("common", { keyPrefix: "main.page" }),
      getT(),
    ]);

  const userName = userProfile?.firstName?.trim() ?? "";
  const currentHour = new Date().getHours();

  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Star />
          {t("greeting", {
            count: currentHour,
            postProcess: "interval",
          })}
          {userName.length > 0 ? <>, {userName}</> : undefined}
        </HeaderMainContent>
      </HeaderMain>

      <ContainerMain>
        <MarkdownProse className="mx-auto">
          {getThemeLocalized(welcomeMessage, lng) ?? tGlobal("_welcomeMessage")}
        </MarkdownProse>
      </ContainerMain>

      <hr className="my-10" />

      <DashboardFavorites />

      <hr className="my-10" />

      <ContainerMain className="mb-10 flex justify-center gap-3">
        <Button
          nativeButton={false}
          render={<Link href="/agent" />}
          size="lg"
          variant="outline"
        >
          <BotMessageSquare />
          {t("labelAllAgents")}
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/app" />}
          size="lg"
          variant="outline"
        >
          <ToolCase />
          {t("labelToApps")}
        </Button>
      </ContainerMain>
    </>
  );
}
