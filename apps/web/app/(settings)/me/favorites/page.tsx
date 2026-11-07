import { Star } from "lucide-react";
import { getT } from "next-i18next/server";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { getCurrentUserConfigFavorites } from "../../../_models/currentUserConfigFavorites";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { hasPermission } from "@/lib/hasPermission";
import { FavoritesEditor } from "./_components/FavoritesEditor";

export default async function Page() {
  const [config, { claims }, { t }] = await Promise.all([
    getCurrentUserConfigFavorites(),
    getWorkspaceClaims(),
    getT("me", { keyPrefix: "favorites" }),
  ]);
  const appearances = Object.fromEntries([
    ...(config.agents ?? []).map((item) => [
      `agent:${item.id}`,
      { name: item.name, color: item.color, icon: item.icon },
    ]),
    ...(config.transcribers ?? []).map((item) => [
      `transcriber:${item.id}`,
      { name: item.name, color: item.color, icon: item.icon },
    ]),
    ...(config.documentRepositories ?? []).map((item) => [
      `documentRepository:${item.id}`,
      { name: item.name, color: item.color, icon: item.icon },
    ]),
    ...claims
      .filter((item) =>
        hasPermission({ claim: item.claim, permission: "user" }),
      )
      .map((item) => [
        `workspace:${item.id}`,
        { name: item.name, color: undefined, icon: undefined },
      ]),
  ]);
  const { favorites, showInSidebar, version } = config;
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Star />
          {t("labelTitle")}
        </HeaderMainContent>
      </HeaderMain>
      <ContainerMain>
        <FavoritesEditor
          key={JSON.stringify({ favorites, showInSidebar })}
          config={{ favorites, showInSidebar, version }}
          appearances={appearances}
        />
      </ContainerMain>
    </>
  );
}
