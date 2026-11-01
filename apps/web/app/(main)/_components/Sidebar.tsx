import { BotMessageSquare, History, Library, ToolCase } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@schornio/aibox-package-ui/components/sidebar";
import Link from "next/link";
import { SidebarActivites } from "./SidebarActivites";
import { Sidebar as SidebarCore } from "../../_components/Sidebar";
import { SidebarFavorites } from "./SidebarFavorites";
import { SidebarNewChat } from "./SidebarNewChat";
import { Suspense } from "react";
import { getT } from "next-i18next/server";

export async function Sidebar() {
  const { t } = await getT("common", {
    keyPrefix: "main._components.Sidebar",
  });

  return (
    <SidebarCore>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarNewChat />
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/agent">
                    <BotMessageSquare /> {t("mainLabelAgents")}
                  </Link>
                }
                tooltip={{ children: t("mainLabelAgents"), side: "inline-end" }}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/workspace">
                    <Library /> {t("mainLabelWorkspaces")}
                  </Link>
                }
                tooltip={{
                  children: t("mainLabelWorkspaces"),
                  side: "inline-end",
                }}
              />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/app">
                    <ToolCase /> {t("mainLabelApps")}
                  </Link>
                }
                tooltip={{ children: t("mainLabelApps"), side: "inline-end" }}
              />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/activity">
                    <History /> {t("history")}
                  </Link>
                }
                tooltip={{ children: t("history"), side: "inline-end" }}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Suspense>
        <SidebarFavorites />
      </Suspense>

      <Suspense>
        <SidebarActivites />
      </Suspense>
    </SidebarCore>
  );
}
