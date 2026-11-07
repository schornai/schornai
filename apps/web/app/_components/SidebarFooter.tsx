import {
  Brain,
  ChevronUp,
  GraphStar,
  LayoutDashboard,
  Settings,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import {
  SidebarFooter as SidebarFooterCore,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@schornio/aibox-package-ui/components/sidebar";
import { AvatarUser } from "@schornio/aibox-package-ui/components/avatar-user";
import Link from "next/link";
import { SidebarUserSignOut } from "./SidebarUserSignOut";
import { getCurrentUserProfile } from "../_models/getCurrentUserProfile";
import { getT } from "next-i18next/server";
import { getWorkspaceClaims } from "../_models/getWorkspaceClaims";

export async function SidebarFooter() {
  const [userProfile, { isAdmin }, { t }] = await Promise.all([
    getCurrentUserProfile(),
    getWorkspaceClaims(),
    getT("common", { keyPrefix: "_components.SidebarFooter" }),
  ]);

  const userName =
    `${userProfile?.firstName ?? ""} ${userProfile?.lastName ?? ""}`.trim();

  return (
    <SidebarFooterCore>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <SidebarMenuButton
              render={
                <DropdownMenuTrigger>
                  <AvatarUser
                    avatarUrl={userProfile?.avatarUrl}
                    firstName={userProfile?.firstName}
                    lastName={userProfile?.lastName}
                  />
                  {userName.length > 0 ? userName : t("labelMyAccount")}
                  <ChevronUp className="ms-auto" />
                </DropdownMenuTrigger>
              }
              size="lg"
              tooltip={{
                children: userName.length > 0 ? userName : t("labelMyAccount"),
                side: "inline-end",
              }}
            />
            <DropdownMenuContent>
              {isAdmin ? (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t("labelSystem")}</DropdownMenuLabel>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      render={
                        <Link href="/cluster">
                          <GraphStar /> {t("labelCluster")}
                        </Link>
                      }
                    />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      render={
                        <Link href="/models">
                          <Brain />
                          {t("labelModels")}
                        </Link>
                      }
                    />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      render={
                        <Link href="/settings">
                          <Settings /> {t("labelSettings")}
                        </Link>
                      }
                    />
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : undefined}
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("labelMyAccount")}</DropdownMenuLabel>
                <DropdownMenuItem
                  className="cursor-pointer"
                  render={
                    <Link href="/">
                      <LayoutDashboard /> {t("labelDashboard")}
                    </Link>
                  }
                />
                <DropdownMenuItem
                  className="cursor-pointer"
                  render={
                    <Link href="/me">
                      <UserRound /> {t("labelProfile")}
                    </Link>
                  }
                />
                <SidebarUserSignOut />
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooterCore>
  );
}
