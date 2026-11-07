import { connectionInputSchema } from "@schornio/aibox-database/connections/connectionInputSchema";
import { saveConnectionSettings } from "@schornio/aibox-database/connections/saveConnectionSettings";
import { listArtifacts } from "@schornio/aibox-database/xrag/listArtifacts";
import { ArtifactCatalogSession } from "../documents/artifactCatalog/ArtifactCatalogSession.ts";
import { z } from "zod";
import type { PlatformContext, platformRegistry } from "./registry.ts";
import { externalModelInputSchema } from "@schornio/aibox-database/aiModel/externalModelInputSchema";
import { createExternalAIModel } from "@schornio/aibox-database/aiModel/createExternalAIModel";
import { updateExternalAIModel } from "@schornio/aibox-database/aiModel/updateExternalAIModel";
import { updateAIModelMetadata } from "@schornio/aibox-database/aiModel/updateAIModelMetadata";
import { deleteAIModel } from "@schornio/aibox-database/aiModel/deleteAIModel";
import { updateWorkspaceAutoJoin } from "@schornio/aibox-database/workspace/updateWorkspaceAutoJoin";
import { updateWorkspaceSSOMapping } from "@schornio/aibox-database/workspace/updateWorkspaceSSOMapping";
import { toggleAdmin } from "@schornio/aibox-database/user/toggleAdmin";
import { updateUserProfileName } from "@schornio/aibox-database/user/updateUserProfileName";
import { listConnections } from "@schornio/aibox-database/connections/listConnections";
import { deleteConnection } from "@schornio/aibox-database/connections/deleteConnection";

export function addAdminTools(
  context: PlatformContext,
  registry: ReturnType<typeof platformRegistry>,
) {
  const { add } = registry;
  const { supabaseServiceRole } = context;
  const options = { supabase: supabaseServiceRole };
  add(
    "platform_model_create",
    "Register an external model. API keys are write-only and never returned.",
    "admin",
    false,
    externalModelInputSchema,
    async (input) => {
      if (input.provider !== "openai-compatible" && !input.apiKey)
        throw new Error("MODEL_API_KEY_REQUIRED");
      return { id: await createExternalAIModel(input, options) };
    },
  );
  add(
    "platform_model_connection_update",
    "Update an external model connection. Empty API key retains its existing secret.",
    "admin",
    false,
    externalModelInputSchema.safeExtend({ id: z.string().min(1) }),
    async (input) => {
      await updateExternalAIModel(input, options);
      return { id: input.id };
    },
  );
  add(
    "platform_model_metadata_update",
    "Update model name and description.",
    "admin",
    false,
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
    }),
    async (input) => ({ id: await updateAIModelMetadata(input, options) }),
  );
  add(
    "platform_model_delete",
    "Remove a model registry entry. Local model files remain on disk.",
    "admin",
    false,
    z.object({ id: z.string().min(1) }),
    async ({ id }) => {
      await deleteAIModel(id, options);
      return { id };
    },
  );
  add(
    "platform_workspace_autojoin_update",
    "Set automatic membership for a workspace. Global administrator required.",
    "admin",
    false,
    z.object({ workspaceId: z.string().min(1), autoJoin: z.boolean() }),
    async ({ workspaceId, autoJoin }) => {
      await updateWorkspaceAutoJoin(
        workspaceId,
        { autoJoin },
        { supabaseServiceRole },
      );
      return { workspaceId };
    },
  );
  add(
    "platform_workspace_sso_mapping_update",
    "Set trusted SAML group mappings for workspace roles. Global administrator required.",
    "admin",
    false,
    z.object({
      workspaceId: z.string().min(1),
      samlMappingUser: z.string().optional(),
      samlMappingEditor: z.string().optional(),
      samlMappingWorkspaceAdmin: z.string().optional(),
    }),
    async ({ workspaceId, ...input }) => {
      await updateWorkspaceSSOMapping(workspaceId, input, {
        supabaseServiceRole,
      });
      return { workspaceId };
    },
  );
  add(
    "platform_user_admin_update",
    "Promote or demote an email user's global administrator role. SSO roles remain provider-managed.",
    "admin",
    false,
    z.object({
      userId: z.uuid(),
      operation: z.enum(["promoteToAdmin", "demoteFromAdmin"]),
    }),
    async ({ userId, operation }) => {
      await toggleAdmin(operation, userId, { supabaseServiceRole });
      return { userId };
    },
  );
  add(
    "platform_user_name_update",
    "Update a user's first and last name.",
    "admin",
    false,
    z.object({ userId: z.uuid(), firstName: z.string(), lastName: z.string() }),
    async ({ userId, ...input }) => {
      await updateUserProfileName(userId, input, { supabaseServiceRole });
      return { userId };
    },
  );
  add(
    "platform_connections_list",
    "List shared provider connection metadata without credentials.",
    "admin",
    true,
    z.object({}),
    () => listConnections(options),
  );
  add(
    "platform_connection_delete",
    "Delete a shared provider connection.",
    "admin",
    false,
    z.object({ id: z.uuid() }),
    async ({ id }) => {
      await deleteConnection(id, options);
      return { id };
    },
  );
  add(
    "platform_connection_save",
    "Create or edit a shared OAuth, Brave or Staan connection. Secrets are write-only. OAuth apps require an explicit issuer URL. Client ID, secret and a configured issuer cannot change; a missing legacy issuer may be supplied once.",
    "admin",
    false,
    connectionInputSchema,
    (input) => saveConnectionSettings(input, options),
  );
  add(
    "platform_artifacts_list",
    "List published artifacts with pagination.",
    "admin",
    true,
    z.object({ offset: z.number().int().min(0).default(0) }),
    ({ offset }) => listArtifacts(offset, options),
  );
  add(
    "platform_artifact_publish",
    "Publish an already uploaded XRAG package. The package must exist in the administrator upload area.",
    "admin",
    false,
    z.object({
      actionFileName: z
        .string()
        .min(1)
        .max(310)
        .regex(/^(?:uploads\/[0-9a-f-]{36}\/)?[^/\\]+$/i)
        .refine((value) => value !== "." && value !== ".."),
    }),
    async ({ actionFileName }) => {
      await using session = new ArtifactCatalogSession({
        serverToken: context.serverToken,
        websocketProvider: context.websocketProvider,
      });
      return { id: await session.publish(actionFileName, options) };
    },
  );
}
