import type { XRAGResource } from "xrag/schema";
import { getAutomationsByIds } from "../automation/getAutomationsByIds.ts";
import { getAgentById } from "../agent/getAgentById.ts";
import { getTranscriberById } from "../transcriber/getTranscriberById.ts";
import { getDocumentRepositoryById } from "../documentRepositories/getDocumentRepositoryById.ts";
import { requirePlatformAccess } from "../mcp/platformAccess.ts";
import { getXRAGClaims, type XRAGOptions } from "./authentication.ts";

/** Read through the caller's RLS client, then authorize the actual workspace. */
export async function getAuthorizedResource(
  kind: XRAGResource["resourceType"],
  id: string,
  options: Pick<XRAGOptions, "supabase" | "authenticated">,
) {
  async function readAutomation() {
    const automation = (await getAutomationsByIds([id], options))[0];
    if (!automation) throw new Error("XRAG_RESOURCE_UNAVAILABLE");
    const agent = await getAgentById(automation.agentId, options);
    return { ...automation, workspaceId: agent.workspaceId };
  }
  const object =
    kind === "automation"
      ? await readAutomation()
      : kind === "agent"
        ? await getAgentById(id, options)
        : kind === "transcriber"
          ? await getTranscriberById(id, options)
          : await getDocumentRepositoryById(id, options);
  requirePlatformAccess(
    await getXRAGClaims(options),
    "admin",
    "workspace",
    object.workspaceId,
  );
  return object;
}
