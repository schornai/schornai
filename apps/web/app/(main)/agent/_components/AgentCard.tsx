"use client";

import {
  CardApp,
  CardAppAvatar,
  CardAppContent,
  CardAppDescription,
  CardAppFooter,
  CardAppHeader,
  CardAppMain,
  CardAppName,
} from "@schornio/aibox-package-ui/components/card-app";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentIconGroupActions } from "./AgentIconGroupActions";
import { AgentIconGroupInfos } from "./AgentIconGroupInfos";
import { BotMessageSquare } from "lucide-react";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import type { SettingFavorites } from "../../../_models/currentUserConfigFavorites";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/hasPermission";

export function AgentCard({
  agent,
  documentRepositoryMap,
  favorites,
  model,
  workspace,
}: {
  agent?: Partial<Agent>;
  documentRepositoryMap: Map<string | symbol, DocumentRepository>;
  favorites?: SettingFavorites;
  model?: AIModel;
  workspace?: WorkspaceClaim;
}) {
  const router = useRouter();

  return (
    <CardApp appColor={agent?.color}>
      <CardAppHeader>
        <BotMessageSquare /> Agent
      </CardAppHeader>
      <CardAppMain
        render={
          agent ? (
            <button
              disabled={
                !hasPermission({ claim: workspace?.claim, permission: "user" })
              }
              onClick={() =>
                router.push(`/agent/${agent?.id}/${crypto.randomUUID()}`)
              }
            />
          ) : undefined
        }
      >
        <CardAppAvatar icon={agent?.icon} />
        <CardAppContent>
          <CardAppName>{agent?.name}</CardAppName>
          <CardAppDescription>{agent?.description}</CardAppDescription>
        </CardAppContent>
      </CardAppMain>
      <CardAppFooter>
        <AgentIconGroupInfos
          agent={agent}
          documentRepositoryMap={documentRepositoryMap}
          model={model}
          workspace={workspace}
        />
        <AgentIconGroupActions
          agent={agent}
          favorites={favorites}
          workspace={workspace}
        />
      </CardAppFooter>
    </CardApp>
  );
}
