import { getUserById } from "@schornio/aibox-database/user/getUserById";
import { getUserIsAdmin } from "@schornio/aibox-database/user/getUserIsAdmin";
import { getWorkspacesWithUserClaim } from "@schornio/aibox-database/workspace/getWorkspacesWithUserClaim";
import { z } from "zod";
import type { PlatformContext, platformRegistry } from "./registry.ts";
import { ServerRealtimeProvider } from "../server/ServerRealtimeProvider.ts";
import {
  servicesDocumentName,
  getMachines,
} from "../documents/services/_schema.ts";
import { getTaskQueueDocumentName } from "../documents/taskQueue/_utils.ts";
import { getTaskQueue } from "../documents/taskQueue/getTaskQueue.ts";
import { getUsersWithWorkspaceClaim } from "@schornio/aibox-database/user/getUsersWithWorkspaceClaim";
export function addMonitoringTools(
  context: PlatformContext,
  { add }: ReturnType<typeof platformRegistry>,
) {
  const config = {
    serverToken: context.serverToken,
    websocketProvider: context.websocketProvider,
  };
  add(
    "platform_services_status",
    "Read reported machines, service health, roles, metrics and artifact synchronization status. Does not execute local operating-system commands.",
    "admin",
    true,
    z.object({}),
    async () => {
      await using p = new ServerRealtimeProvider({
        ...config,
        documentName: servicesDocumentName,
      });
      await p.waitForSynced();
      return [...getMachines(p.document).values()];
    },
  );
  add(
    "platform_tasks_list",
    "Read task identifiers, types and states as in the task dashboard. Task credentials and payloads are excluded.",
    "admin",
    true,
    z.object({}),
    async () => {
      await using p = new ServerRealtimeProvider({
        ...config,
        documentName: getTaskQueueDocumentName(),
      });
      await p.waitForSynced();
      return getTaskQueue(p.document)
        .tasks.toArray()
        .map(({ id, type, state }) => ({ id, type, state }));
    },
  );
  add(
    "platform_workspace_users",
    "Read the user directory with membership roles for a workspace, as in global administration.",
    "admin",
    true,
    z.object({ workspaceId: z.string().min(1) }),
    ({ workspaceId }) =>
      getUsersWithWorkspaceClaim(workspaceId, {
        supabaseServiceRole: context.supabaseServiceRole,
      }),
  );
  add(
    "platform_permissions_get",
    "Read your authenticated workspace permissions and the configured platform access ceiling. The ceiling never grants permissions.",
    "user",
    true,
    z.object({}),
    async () => ({ claims: context.claims, accessLevel: context.level }),
  );
  add(
    "platform_user_get",
    "Read a user's profile, global administrator status and workspace memberships as in user administration.",
    "admin",
    true,
    z.object({ userId: z.uuid() }),
    async ({ userId }) => {
      const options = { supabaseServiceRole: context.supabaseServiceRole };
      const [profile, isAdmin, workspaces] = await Promise.all([
        getUserById(userId, options),
        getUserIsAdmin(userId, options),
        getWorkspacesWithUserClaim(userId, options),
      ]);
      return { profile, isAdmin, workspaces };
    },
  );
}
