"use client";

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
import type { Workspace } from "@schornio/aibox-package-database/workspace/_types";
import { useRouter } from "next/navigation";

function SidebarFavoriteItem({
  aside,
  color,
  link,
  icon,
  image,
  name,
  onClick,
}: {
  aside?: ReactNode;
  color?: AppColor;
  icon?: AppIcon;
  image?: Image;
  link?: string;
  name?: string;
  onClick?: () => void;
}) {
  return (
    <SidebarMenuItem className="flex items-center">
      <ContainerStyled
        appColor={color}
        interactive
        className="border-2 border-transparent"
        render={
          <SidebarMenuButton
            onClick={onClick}
            render={link ? <Link href={link} /> : <div />}
            size="lg"
            tooltip={{ children: name, side: "inline-end" }}
          >
            <AvatarApp
              className="group-data-[collapsible=icon]:-ms-0.5"
              fallback={name}
              icon={icon}
              image={image}
            />
            {name}
            {aside ? <div className="ms-auto">{aside}</div> : undefined}
          </SidebarMenuButton>
        }
      />
    </SidebarMenuItem>
  );
}

export function SidebarFavoriteItemAgent({ agent }: { agent?: Agent }) {
  const router = useRouter();

  if (!agent) {
    return undefined;
  }

  return (
    <SidebarFavoriteItem
      aside={
        <Button disabled size="icon-sm" variant="ghost">
          {/* TODO: dropdown für favoriten */}
          <BotMessageSquare />
        </Button>
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
}: {
  transcriber?: Transcriber;
}) {
  const router = useRouter();

  if (!transcriber) {
    return undefined;
  }

  return (
    <SidebarFavoriteItem
      aside={
        <Button disabled size="icon-sm" variant="ghost">
          {/* TODO: dropdown für favoriten */}
          <AudioLines />
        </Button>
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
}: {
  documentRepository?: DocumentRepository;
}) {
  if (!documentRepository) {
    return undefined;
  }

  return (
    <SidebarFavoriteItem
      aside={
        <Button disabled size="icon-sm" variant="ghost">
          {/* TODO: dropdown für favoriten */}
          <FolderOpen />
        </Button>
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
}: {
  workspace?: Workspace;
}) {
  if (!workspace) return undefined;
  return (
    <SidebarFavoriteItem
      aside={<Library className="size-4" />}
      link={`/workspace/${workspace.id}`}
      name={workspace.name}
    />
  );
}
