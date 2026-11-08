"use client";
import { defaultPlatformAgentAccess } from "@schornio/aibox-package-database/mcp/platformAgentPolicy";

import {
  Calculator,
  DraftingCompass,
  File,
  Globe,
  MessageSquareQuote,
  Plug,
} from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { defaultWebAccess } from "@schornio/aibox-package-database/agent/webAccess";
import { useAgentEditor } from "./AgentEditor";
import { useRouter } from "next/navigation";
import { useT } from "next-i18next/client";

export function AgentEditorRoleTools({ roleId }: { roleId: string }) {
  const router = useRouter();
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorRoleTools",
  });
  const { setAgentRole } = useAgentEditor();

  return (
    <ContainerMain className="flex flex-col items-start">
      <h3 className="p-3 font-medium">{t("labelData")}</h3>

      <Button
        onClick={() => {
          setAgentRole(roleId, (role) => ({
            ...role,
            documentRepositoryMounts: [
              ...(role.documentRepositoryMounts ?? []),
              {
                documentRepositoryIdentifier: "",
                id: crypto.randomUUID(),
                mount: "/",
                pathRepository: "/",
                permission: "read-only",
              },
            ],
          }));
          router.push(
            `?view=roles&role-${roleId}=documentRepositoryMounts#role-${roleId}`,
          );
        }}
        variant="ghost"
      >
        <File /> {t("labelConnectRepository")}
      </Button>

      <Button
        onClick={() => {
          setAgentRole(roleId, (role) => ({
            ...role,
            toolWebAccess: role.toolWebAccess ?? { ...defaultWebAccess },
          }));
          router.push(`?view=roles&role-${roleId}=tool-web#role-${roleId}`);
        }}
        variant="ghost"
      >
        <Globe /> {t("labelToolWebAccess")}
      </Button>

      <Button
        onClick={() => {
          setAgentRole(roleId, (role) => ({
            ...role,
            mcps: [
              ...(role.mcps ?? []),
              { headers: {}, id: crypto.randomUUID(), type: "http", url: "" },
            ],
          }));
          router.push(`?view=roles&role-${roleId}=mcps#role-${roleId}`);
        }}
        variant="ghost"
      >
        <Plug /> {t("labelConnectMCP")}
      </Button>

      <hr className="my-5 w-full border-dashed" />

      <h3 className="p-3 font-medium">{t("labelSupport")}</h3>

      <Button
        variant="ghost"
        onClick={() => {
          setAgentRole(roleId, (role) => ({
            ...role,
            toolChatAwareness: {
              ...(role.toolChatAwareness ?? {
                active: true,
                updateChatLabel: true,
                recommendNextMessages: true,
                currentDateTime: true,
              }),
              active: true,
            },
          }));
          router.push(
            `?view=roles&role-${roleId}=tool-chat-extensions#role-${roleId}`,
          );
        }}
      >
        <MessageSquareQuote /> {t("labelToolChatExtensions")}
      </Button>

      <Button
        variant="ghost"
        onClick={() => {
          setAgentRole(roleId, (role) => ({
            ...role,
            toolCalculator: { ...role.toolCalculator, active: true },
          }));
          router.push(
            `?view=roles&role-${roleId}=tool-calculator#role-${roleId}`,
          );
        }}
      >
        <Calculator /> {t("labelToolCalculator")}
      </Button>

      <hr className="my-5 w-full border-dashed" />

      <h3 className="p-3 font-medium">{t("labelSystem")}</h3>

      <Button
        variant="ghost"
        onClick={() => {
          setAgentRole(roleId, (role) => ({
            ...role,
            toolPlatformAccess: {
              ...(role.toolPlatformAccess ??
                structuredClone(defaultPlatformAgentAccess)),
              active: true,
            },
          }));
          router.push(
            `?view=roles&role-${roleId}=tool-platform#role-${roleId}`,
          );
        }}
      >
        <DraftingCompass /> {t("labelToolPlatformAccess")}
      </Button>
    </ContainerMain>
  );
}
