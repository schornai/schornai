import {
  calculate,
  calculatorInputSchema,
  calculatorDescription,
} from "../tools/calculate.ts";
import { currentDateTime } from "../tools/currentDateTime.ts";
import { addMonitoringTools } from "./monitoringTools.ts";
import { addWorkflowTools } from "./workflowTools.ts";
import { addProfileTools } from "./profileTools.ts";
import { addSettingsTools } from "./settingsTools.ts";
import { addAdminTools } from "./adminTools.ts";
import { addChatTools } from "./chatTools.ts";
import { z } from "zod";
import { platformRegistry, type PlatformContext } from "./registry.ts";
import { getWorkspaces } from "@schornio/aibox-database/workspace/getWorkspaces";
import { getAgents } from "@schornio/aibox-database/agent/getAgents";
import { getAgentById } from "@schornio/aibox-database/agent/getAgentById";
import { createAgent } from "@schornio/aibox-database/agent/createAgent";
import { updateAgent } from "@schornio/aibox-database/agent/updateAgent";
import { deleteAgent } from "@schornio/aibox-database/agent/deleteAgent";
import { agentSchema } from "@schornio/aibox-database/agent/_schemas";
import { getDocumentRepositories } from "@schornio/aibox-database/documentRepositories/getDocumentRepositories";
import { getDocumentRepositoryById } from "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById";
import { createDocumentRepository } from "@schornio/aibox-database/documentRepositories/createDocumentRepository";
import { updateDocumentRepository } from "@schornio/aibox-database/documentRepositories/updateDocumentRepository";
import { deleteDocumentRepository } from "@schornio/aibox-database/documentRepositories/deleteDocumentRepository";
import { documentRepositorySchema } from "@schornio/aibox-database/documentRepositories/_schema";
import { getTranscribers } from "@schornio/aibox-database/transcriber/getTranscribers";
import { getTranscriberById } from "@schornio/aibox-database/transcriber/getTranscriberById";
import { createTranscriber } from "@schornio/aibox-database/transcriber/createTranscriber";
import { updateTranscriber } from "@schornio/aibox-database/transcriber/updateTranscriber";
import { deleteTranscriber } from "@schornio/aibox-database/transcriber/deleteTranscriber";
import { transcriberSchema } from "@schornio/aibox-database/transcriber/_schemas";
import { getAIModels } from "@schornio/aibox-database/aiModel/getAIModels";
import { createWorkspace } from "@schornio/aibox-database/workspace/createWorkspace";
import { updateWorkspaceDescription } from "@schornio/aibox-database/workspace/updateWorkspaceDescription";
import { updateWorkspaceDocumentation } from "@schornio/aibox-database/workspace/updateWorkspaceDocumentation";
import { getUsers } from "@schornio/aibox-database/user/getUsers";
import { updateUserPermission } from "@schornio/aibox-database/user/updateUserPermission";
import { addStorageTools } from "./storageTools.ts";

export function createPlatformTools(context: PlatformContext) {
  const registry = platformRegistry(context);
  const { add, workspace } = registry;
  const { supabase, supabaseServiceRole } = context;
  const id = z.object({ id: z.string().min(1) });
  const empty = z.object({});
  add(
    "platform_workspaces_list",
    "List workspaces accessible to the current user.",
    "user",
    true,
    empty,
    () => getWorkspaces({ supabase }),
  );
  add(
    "platform_agents_list",
    "List accessible agents and their configurations. Use agent IDs to start chats.",
    "user",
    true,
    empty,
    () => getAgents({ supabase }),
  );
  add(
    "platform_agent_get",
    "Read an accessible agent configuration.",
    "user",
    true,
    id,
    async ({ id }) => getAgentById(id, { supabase }),
  );
  add(
    "platform_repositories_list",
    "List accessible document repositories and their workspace IDs.",
    "user",
    true,
    empty,
    () => getDocumentRepositories({ supabase }),
  );
  add(
    "platform_transcribers_list",
    "List accessible transcriber configurations.",
    "user",
    true,
    empty,
    () => getTranscribers({ supabase }),
  );
  add(
    "platform_models_list",
    "List model metadata, without credentials.",
    "user",
    true,
    empty,
    () => getAIModels({ supabase }),
  );

  add(
    "platform_agent_create",
    "Create an agent, optionally cloning retained MCP credentials with copyFromAgentId. Keep source role/MCP IDs and URLs unchanged for credential copying; null header values retain secrets server-side. Requires workspace administrator access to both source and target.",
    "workspace",
    false,
    z.object({
      agent: agentSchema,
      copyFromAgentId: z.string().min(1).optional(),
    }),
    async ({ agent, copyFromAgentId }) => {
      workspace("workspace", agent.workspaceId);
      let copyFrom;
      if (copyFromAgentId) {
        const source = await getAgentById(copyFromAgentId, { supabase });
        workspace("workspace", source.workspaceId);
        copyFrom = { agentId: source.id, workspaceId: source.workspaceId };
      }
      return createAgent(agent, { supabaseServiceRole, copyFrom });
    },
  );
  add(
    "platform_agent_update",
    "Update an agent. Both saved and target workspaces require administrator access. Null MCP header values preserve credentials.",
    "workspace",
    false,
    z.object({ agent: agentSchema }),
    async ({ agent }) => {
      const saved = await getAgentById(agent.id, { supabase });
      workspace("workspace", saved.workspaceId);
      workspace("workspace", agent.workspaceId);
      await updateAgent(agent, {
        supabaseServiceRole,
        expectedWorkspaceId: saved.workspaceId,
      });
      return { id: agent.id };
    },
  );
  add(
    "platform_agent_delete",
    "Permanently delete an agent.",
    "workspace",
    false,
    id,
    async ({ id }) => {
      workspace(
        "workspace",
        (await getAgentById(id, { supabase })).workspaceId,
      );
      await deleteAgent(id, { supabase });
      return { id };
    },
  );
  add(
    "platform_repository_create",
    "Create a document repository in an administered workspace.",
    "workspace",
    false,
    z.object({ repository: documentRepositorySchema }),
    async ({ repository }) => {
      workspace("workspace", repository.workspaceId);
      return createDocumentRepository(repository, { supabase });
    },
  );
  add(
    "platform_repository_update",
    "Update a document repository; authorize both source and target workspace.",
    "workspace",
    false,
    z.object({ repository: documentRepositorySchema }),
    async ({ repository }) => {
      workspace(
        "workspace",
        (await getDocumentRepositoryById(repository.id, { supabase }))
          .workspaceId,
      );
      workspace("workspace", repository.workspaceId);
      await updateDocumentRepository(repository, { supabase });
      return { id: repository.id };
    },
  );
  add(
    "platform_repository_delete",
    "Delete a document repository.",
    "workspace",
    false,
    id,
    async ({ id }) => {
      workspace(
        "workspace",
        (await getDocumentRepositoryById(id, { supabase })).workspaceId,
      );
      await deleteDocumentRepository(id, { supabase });
      return { id };
    },
  );
  add(
    "platform_transcriber_create",
    "Create a transcriber in an administered workspace.",
    "workspace",
    false,
    z.object({ transcriber: transcriberSchema }),
    async ({ transcriber }) => {
      workspace("workspace", transcriber.workspaceId);
      await createTranscriber(transcriber, { supabase });
      return { id: transcriber.id };
    },
  );
  add(
    "platform_transcriber_update",
    "Update a transcriber; authorize both source and target workspace.",
    "workspace",
    false,
    z.object({ transcriber: transcriberSchema }),
    async ({ transcriber }) => {
      workspace(
        "workspace",
        (await getTranscriberById(transcriber.id, { supabase })).workspaceId,
      );
      workspace("workspace", transcriber.workspaceId);
      await updateTranscriber(transcriber, { supabase });
      return { id: transcriber.id };
    },
  );
  add(
    "platform_transcriber_delete",
    "Delete a transcriber.",
    "workspace",
    false,
    id,
    async ({ id }) => {
      workspace(
        "workspace",
        (await getTranscriberById(id, { supabase })).workspaceId,
      );
      await deleteTranscriber(id, { supabase });
      return { id };
    },
  );
  add(
    "platform_workspace_update",
    "Update workspace name and description.",
    "workspace",
    false,
    z.object({
      workspaceId: z.string().min(1),
      name: z.string(),
      description: z.string(),
    }),
    async ({ workspaceId, ...input }) => {
      workspace("workspace", workspaceId);
      await updateWorkspaceDescription(workspaceId, input, {
        supabaseServiceRole,
      });
      return { workspaceId };
    },
  );
  add(
    "platform_workspace_documentation_update",
    "Update workspace documentation.",
    "workspace",
    false,
    z.object({ workspaceId: z.string().min(1), documentation: z.string() }),
    async ({ workspaceId, documentation }) => {
      workspace("workspace", workspaceId);
      await updateWorkspaceDocumentation(
        workspaceId,
        { documentation },
        { supabaseServiceRole },
      );
      return { workspaceId };
    },
  );
  add(
    "platform_workspace_create",
    "Create a workspace; global administrator required.",
    "admin",
    false,
    z.object({ name: z.string().min(1), description: z.string() }),
    (input) => createWorkspace(input, { supabaseServiceRole }),
  );
  add(
    "platform_users_list",
    "List user profiles; global administrator required.",
    "admin",
    true,
    empty,
    () => getUsers({ supabaseServiceRole }),
  );
  add(
    "platform_user_permission_update",
    "Assign or remove a user's workspace role; global administrator required.",
    "admin",
    false,
    z.object({
      userId: z.uuid(),
      workspaceId: z.string().min(1),
      role: z.enum(["user", "editor", "workspace-admin", "none"]),
    }),
    async (input) => {
      await updateUserPermission(input, { supabaseServiceRole });
      return { userId: input.userId, workspaceId: input.workspaceId };
    },
  );
  add(
    "platform_calculate",
    calculatorDescription,
    "user",
    true,
    calculatorInputSchema,
    async ({ expression }) => ({ expression, result: calculate(expression) }),
  );
  add(
    "platform_current_date_time",
    "Read the current date and time in an optional IANA time zone (default UTC).",
    "user",
    true,
    z.object({ timeZone: z.string().max(100).optional() }),
    async ({ timeZone }) => currentDateTime(timeZone),
  );
  addStorageTools(context, registry);
  addChatTools(context, registry);
  addAdminTools(context, registry);
  addSettingsTools(context, registry);
  addProfileTools(context, registry);
  addWorkflowTools(context, registry);
  addMonitoringTools(context, registry);
  return registry.tools;
}
