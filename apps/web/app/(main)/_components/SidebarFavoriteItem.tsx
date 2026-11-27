"use client";
import { AutomationAvatar } from "../app/automation/_components/AutomationAvatar";
import { CircleChevronsRight } from "@/lib/icons/circle-chevrons-right";
import type { Automation } from "@schornio/aibox-package-database/automation/_types";

import type {
  AppColor,
  AppIcon,
  Image,
} from "@schornio/aibox-package-database/_shared/_types";
import {
  AudioLines,
  BotMessageSquare,
  FolderOpen,
  Library,
} from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@schornio/aibox-package-ui/components/sidebar";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AvatarApp } from "@schornio/aibox-package-ui/components/avatar-app";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Transcriber_new as Transcriber } from "@schornio/aibox-package-database/transcriber/_types";
import type { WorkspaceClaim } from "../../_models/getWorkspaceClaims";
import type { SettingFavorites } from "../../_models/currentUserConfigFavorites";
import { useT } from "next-i18next/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@schornio/aibox-package-ui/components/dropdown-menu";
import { useRouter } from "next/navigation";

import { AgentIconGroupActions } from "../agent/_components/AgentIconGroupActions";
import { TranscriberIconGroupActions } from "../app/transcribe/_components/TranscriberIconGroupActions";
import { DocumentRepositoryIconGroupActions } from "../app/documents/_components/DocumentRepositoryIconGroupActions";
import { WorkspaceIconGroupActions } from "../workspace/_components/WorkspaceIconGroupActions";
import { AutomationIconGroupActions } from "../app/automation/_components/AutomationIconGroupActions";

type FavoriteItemProps = {
  favorites?: SettingFavorites;
  workspace?: WorkspaceClaim;
};

function SidebarFavoriteItem({
  typeIcon,
  actions,
  avatar,
  color,
  link,
  icon,
  image,
  name,
  onClick,
}: {
  typeIcon: ReactNode;
  actions: ReactNode;
  avatar?: ReactNode;
  color?: AppColor;
  icon?: AppIcon;
  image?: Image;
  link?: string;
  name?: string;
  onClick?: () => void;
}) {
  const { t } = useT("common", {
    keyPrefix: "main._components.SidebarFavorites",
  });
  return (
    <SidebarMenuItem className="flex items-center">
      <ContainerStyled
        appColor={color}
        interactive
        className="border-2 border-transparent"
        render={
          <SidebarMenuButton
            className="pe-10"
            onClick={onClick}
            render={link ? <Link href={link} /> : <button type="button" />}
            size="lg"
            tooltip={{ children: name, side: "inline-end" }}
          >
            {avatar ?? (
              <AvatarApp
                className="group-data-[collapsible=icon]:-ms-0.5"
                fallback={name}
                icon={icon}
                image={image}
              />
            )}
            <span className="truncate">{name}</span>
          </SidebarMenuButton>
        }
      />
      <DropdownMenu>
        <Button
          render={<DropdownMenuTrigger />}
          className="absolute end-2 group-data-[collapsible=icon]:hidden"
          variant="ghost"
          size="icon-sm"
          aria-label={t("labelActions", { name })}
        >
          {typeIcon}
        </Button>
        <DropdownMenuContent align="end">{actions}</DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function SidebarFavoriteItemAgent({
  agent,
  workspace,
  favorites,
}: FavoriteItemProps & { agent?: Agent }) {
  const router = useRouter();

  if (!agent) {
    return undefined;
  }

  return (
    <SidebarFavoriteItem
      typeIcon={<BotMessageSquare />}
      actions={
        <AgentIconGroupActions
          display="menu"
          favorites={favorites}
          workspace={workspace}
          agent={agent}
        />
      }
      color={agent.color}
      icon={agent.icon}
      name={agent.name}
      onClick={() => router.push(`/agent/${agent.id}/${crypto.randomUUID()}`)}
    />
  );
}

export function SidebarFavoriteItemTranscriber({
  transcriber,
  workspace,
  favorites,
}: FavoriteItemProps & { transcriber?: Transcriber }) {
  const router = useRouter();

  if (!transcriber) {
    return undefined;
  }

  return (
    <SidebarFavoriteItem
      typeIcon={<AudioLines />}
      actions={
        <TranscriberIconGroupActions
          display="menu"
          favorites={favorites}
          workspace={workspace}
          transcriber={transcriber}
        />
      }
      color={transcriber.color}
      icon={transcriber.icon}
      name={transcriber.name}
      onClick={() =>
        router.push(
          `/app/transcribe/${transcriber.id}/${crypto.randomUUID()}/files`,
        )
      }
    />
  );
}

export function SidebarFavoriteItemDocumentRepository({
  documentRepository,
  workspace,
  favorites,
}: FavoriteItemProps & { documentRepository?: DocumentRepository }) {
  if (!documentRepository) {
    return undefined;
  }

  return (
    <SidebarFavoriteItem
      typeIcon={<FolderOpen />}
      actions={
        <DocumentRepositoryIconGroupActions
          display="menu"
          favorites={favorites}
          workspace={workspace}
          documentRepository={documentRepository}
        />
      }
      color={documentRepository.color}
      icon={documentRepository.icon}
      link={`/app/documents/${documentRepository.id}/files`}
      name={documentRepository.name}
    />
  );
}

export function SidebarFavoriteItemWorkspace({
  workspace,
  favorites,
}: FavoriteItemProps) {
  if (!workspace) return undefined;
  return (
    <SidebarFavoriteItem
      typeIcon={<Library />}
      actions={
        <WorkspaceIconGroupActions
          display="menu"
          favorites={favorites}
          workspace={workspace}
        />
      }
      link={`/workspace/${workspace.id}`}
      name={workspace.name}
    />
  );
}

export function SidebarFavoriteItemAutomation({
  automation,
  favorites,
}: FavoriteItemProps & { automation?: Automation }) {
  if (!automation) return null;
  return (
    <SidebarFavoriteItem
      avatar={
        <AutomationAvatar
          className="group-data-[collapsible=icon]:-ms-0.5"
          icon={automation.icon}
          fallback={automation.name}
        />
      }
      typeIcon={<CircleChevronsRight />}
      actions={
        <AutomationIconGroupActions
          display="menu"
          favorites={favorites}
          automation={automation}
        />
      }
      color={automation.color}
      icon={automation.icon}
      name={automation.name}
      link={`/app/automation/${automation.id}/info`}
    />
  );
}
