"use client";

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@schornio/aibox-package-ui/components/sidebar";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import { MessageSquarePlus } from "lucide-react";
import { useActivityTypeInfos } from "./ActivityContextProvider";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function SidebarNewChat() {
  const { t } = useT("common", {
    keyPrefix: "main._components.SidebarNewChat",
  });

  const router = useRouter();

  const pathname = usePathname();
  const [, , agentId] = pathname.startsWith("/agent/")
    ? pathname.split("/")
    : [];

  const typeInfos = useActivityTypeInfos();
  const agentTypeInfo = typeInfos.get(agentId ?? "not_set");

  if (!agentTypeInfo) {
    return undefined;
  }

  return (
    <ContainerStyled
      appColor={agentTypeInfo.color}
      className="overflow-hidden rounded-lg p-0 group-data-[collapsible=icon]:size-8"
      render={<SidebarMenuItem />}
      variant="card"
    >
      <SidebarMenuButton
        onClick={() => router.push(`/agent/${agentId}/${crypto.randomUUID()}`)}
        tooltip={{ children: t("labelNewChat"), side: "inline-end" }}
      >
        <MessageSquarePlus /> {t("labelNewChat")}
      </SidebarMenuButton>
    </ContainerStyled>
  );
}
