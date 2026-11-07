"use client";
import { AgentInfoToolPlatformAccess } from "./AgentInfoToolPlatformAccess";

import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentInfoToolWebAccess } from "./AgentInfoToolWebAccess";
import { AgentInfoMCPs } from "./AgentInfoMCPs";
import { AgentInfoModel } from "./AgentInfoModel";
import { AgentInfoPrompt } from "./AgentInfoPrompt";
import { AgentInfoRoleDocumentRepository } from "./AgentInfoRoleDocumentRepository";
import { AgentInfoRoleSelectionHint } from "./AgentInfoRoleSelectionHint";
import type { DocumentRepository } from "@schornio/aibox-package-database/documentRepositories/_types";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function AgentInfoRole({
  className,
  documentRepositoryMap,
  editAgentPathname,
  editDefaultRole,
  editable,
  modelMap,
  role,
}: {
  className?: string;
  documentRepositoryMap: Map<string | symbol, DocumentRepository>;
  editable?: boolean;
  editAgentPathname?: string;
  editDefaultRole?: Agent["roles"][number];
  modelMap?: Map<string | symbol, AIModel>;
  role: Agent["roles"][number];
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <AgentInfoPrompt
        agentRole={{
          prompt: role.prompt,
        }}
        editAgentPathname={editAgentPathname}
        editDefaultRole={editDefaultRole}
        editRoleId={editable ? role.id : undefined}
      />
      {role.documentRepositoryMounts.length > 0 ? (
        <AgentInfoRoleDocumentRepository
          documentRepositoryMounts={role.documentRepositoryMounts}
          documentRepositoryMap={documentRepositoryMap}
          editAgentPathname={editAgentPathname}
          editDefaultRole={editDefaultRole}
          editRoleId={editable ? role.id : undefined}
        />
      ) : undefined}
      {(role.mcps?.length ?? 0) > 0 ? (
        <AgentInfoMCPs
          agentRole={role}
          editAgentPathname={editAgentPathname}
          editDefaultRole={editDefaultRole}
          editRoleId={editable ? role.id : undefined}
        />
      ) : undefined}
      {role.toolWebAccess ? (
        <AgentInfoToolWebAccess
          agentRole={role}
          editAgentPathname={editAgentPathname}
          editDefaultRole={editDefaultRole}
          editRoleId={editable ? role.id : undefined}
        />
      ) : undefined}
      {role.toolPlatformAccess?.active && (
        <AgentInfoToolPlatformAccess agentRole={role} />
      )}
      {role.modelIdentifierOverride ? (
        <AgentInfoModel
          editAgentPathname={editAgentPathname}
          editDefaultModelIdentifier={editDefaultRole?.modelIdentifierOverride}
          editDefaultModelThinking={editDefaultRole?.modelThinkingOverride}
          editRoleId={editable ? role.id : undefined}
          editable={true}
          modelIdentifier={role.modelIdentifierOverride}
          modelThinking={role.modelThinkingOverride}
          model={modelMap?.get(role.modelIdentifierOverride)}
        />
      ) : undefined}
      {role.roleSelectionHint ? (
        <AgentInfoRoleSelectionHint
          agentRole={role}
          editAgentPathname={editAgentPathname}
          editDefaultRole={editDefaultRole}
          editRoleId={editable ? role.id : undefined}
        />
      ) : undefined}
    </div>
  );
}
