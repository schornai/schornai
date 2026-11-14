import { getCurrentUserConfigFavorites } from "../../../../_models/currentUserConfigFavorites";
import { getSystemConfigTheme } from "../../../../_models/systemConfigTheme";
import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getAutomationContext } from "../../../../_models/getAutomationContext";
import { getAutomations } from "@schornio/aibox-package-database/automation/getAutomations";
import { getAgents } from "@schornio/aibox-package-database/agent/getAgents";
import { requirePlatformAccess } from "@schornio/aibox-package-database/mcp/platformAccess";
import { getDocumentRepositories } from "../../../../_models/getDocumentRepositories";
import { getAIModels } from "../../../../_models/getAIModels";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
export const getAutomationPageData = cache(async (id?: string) => {
  const context = await getAutomationContext();
  const [
    automations,
    agents,
    repositories,
    models,
    workspaceClaims,
    favorites,
    theme,
  ] = await Promise.all([
    getAutomations(context),
    getAgents({ supabase: context.supabase }),
    getDocumentRepositories(),
    getAIModels(),
    getWorkspaceClaims(),
    getCurrentUserConfigFavorites(),
    getSystemConfigTheme(),
  ]);
  const automation = automations.find((item) => item.id === id);
  if (id && !automation) notFound();
  const editableAgents = agents.filter((agent) => {
    try {
      requirePlatformAccess(
        context.claims,
        "admin",
        "editor",
        agent.workspaceId,
      );
      return true;
    } catch {
      return false;
    }
  });
  return {
    automation,
    favorites,
    theme,
    context,
    agents: editableAgents,
    repositories,
    models,
    workspaces: workspaceClaims.claims,
  };
});
