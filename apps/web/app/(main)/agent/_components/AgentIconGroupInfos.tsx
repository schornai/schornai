"use client";

import { Brain, FolderOpen, Library, Plug } from "lucide-react";
import {
  IconGroup,
  IconGroupInfo,
} from "@schornio/aibox-package-ui/components/icon-group";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { UserRoleText } from "../../../_components/UserRoleText";
import type { WorkspaceClaim } from "../../../_models/getWorkspaceClaims";
import { trySync } from "@schornio/aibox-package-utils/trySync";
import { useT } from "next-i18next/client";

export function AgentIconGroupInfos({
  agent,
  documentRepositoryMap,
  model,
  workspace,
}: {
  agent?: Partial<Agent>;
  documentRepositoryMap: Map<string | symbol, DocumentRepository>;
  model?: AIModel;
  workspace?: WorkspaceClaim;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentIconGroupInfos",
  });

  return (
    <IconGroup>
      {agent?.roles?.some(
        (role) => role.documentRepositoryMounts.length > 0,
      ) ? (
        <IconGroupInfo
          tooltip={Array.from(
            new Set(
              agent.roles
                .map((role) =>
                  role.documentRepositoryMounts.map(
                    (mount) =>
                      documentRepositoryMap.get(
                        mount.documentRepositoryIdentifier,
                      )?.name ?? "",
                  ),
                )
                .flat(),
            ),
          ).join("/n")}
        >
          <FolderOpen />
        </IconGroupInfo>
      ) : undefined}
      {agent?.roles?.some((role) => (role.mcps?.length ?? 0) > 0) ? (
        <IconGroupInfo
          tooltip={Array.from(
            new Set(
              agent.roles
                .map((role) =>
                  role.mcps?.map(
                    (mcp) =>
                      mcp.name ?? trySync(() => new URL(mcp.url).host).data,
                  ),
                )
                .flat(),
            ),
          ).join("/n")}
        >
          <Plug />
        </IconGroupInfo>
      ) : undefined}
      <IconGroupInfo tooltip={model?.name ?? t("labelModelUnknown")}>
        <Brain />
      </IconGroupInfo>
      <IconGroupInfo
        tooltip={
          <>
            {workspace?.name ?? t("labelUnknownWorkspace")},{" "}
            <UserRoleText role={workspace?.claim} />
          </>
        }
      >
        <Library />
      </IconGroupInfo>
    </IconGroup>
  );
}
