import {
  Brain,
  CircleArrowLeft,
  GraphStar,
  Settings,
  UserRound,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@schornio/aibox-package-ui/components/sidebar";
import Link from "next/link";
import { Sidebar as SidebarCore } from "../../_components/Sidebar";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../../_models/getWorkspaceClaims";

export async function Sidebar() {
  const [{ t }, { isAdmin }] = await Promise.all([
    getT("common", { keyPrefix: "settings._components.Sidebar" }),
    getWorkspaceClaims(),
  ]);

  return (
    <SidebarCore>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/me">
                    <UserRound /> {t("labelProfile")}
                  </Link>
                }
                tooltip={{ children: t("labelProfile"), side: "inline-end" }}
              />
            </SidebarMenuItem>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  render={
                    <Link href="/me/favorites">{t("labelFavorites")}</Link>
                  }
                />
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  render={
                    <Link href="/me/permissions">{t("labelPermissions")}</Link>
                  }
                />
              </SidebarMenuSubItem>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  render={
                    <Link href="/me/connections">{t("labelConnections")}</Link>
                  }
                />
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {isAdmin ? (
        <>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/cluster">
                        <GraphStar />
                        {t("labelCluster")}
                      </Link>
                    }
                    tooltip={{
                      children: t("labelCluster"),
                      side: "inline-end",
                    }}
                  />
                </SidebarMenuItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<Link href="/service">{t("labelService")}</Link>}
                    />
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<Link href="/tasks">{t("labelTaskQueue")}</Link>}
                    />
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link href="/artifacts">{t("labelArtifacts")}</Link>
                      }
                    />
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/models">
                        <Brain />
                        {t("labelModels")}
                      </Link>
                    }
                    tooltip={{ children: t("labelModels"), side: "inline-end" }}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuSubItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/settings">
                        <Settings /> {t("labelSettings")}
                      </Link>
                    }
                    tooltip={{
                      children: t("labelSettings"),
                      side: "inline-end",
                    }}
                  />
                </SidebarMenuSubItem>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link href="/settings/user"> {t("labelUsers")}</Link>
                      }
                    />
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link href="/settings/workspace">
                          {t("labelWorkspaces")}
                        </Link>
                      }
                    />
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link href="/settings/connections">
                          {t("labelProviderConnections")}
                        </Link>
                      }
                    />
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link href="/settings/sso">
                          {t("labelSSOProvider")}
                        </Link>
                      }
                    />
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link href="/settings/xrag">
                          {t("labelXRAGUpload")}
                        </Link>
                      }
                    />
                  </SidebarMenuSubItem>
                  {/* <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  render={
                    <Link href="/settings/system-model">
                      {t("labelSystemModel")}
                    </Link>
                  }
                />
              </SidebarMenuSubItem> */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={
                        <Link href="/settings/theme">{t("labelTheme")}</Link>
                      }
                    />
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : undefined}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/">
                    <CircleArrowLeft className="rtl:rotate-180" />{" "}
                    {t("labelBackToDashboard")}
                  </Link>
                }
                tooltip={{
                  children: t("labelBackToDashboard"),
                  side: "inline-end",
                }}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarCore>
  );
}
