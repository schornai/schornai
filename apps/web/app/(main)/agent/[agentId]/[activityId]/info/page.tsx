import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { AgentInfo } from "../../../_components/AgentInfo";
import { BotMessageSquare } from "lucide-react";
import { TabsChat } from "../_components/TabsChat";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../../../_models/getAIModels";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { getCurrentUserConfigFavorites } from "../../../../../_models/currentUserConfigFavorites";
import { getDocumentRepositories } from "../../../../../_models/getDocumentRepositories";
import { getWorkspaceClaims } from "../../../../../_models/getWorkspaceClaims";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";

export default async function Page(
  params: PageProps<"/agent/[agentId]/[activityId]/info">,
) {
  const [{ agentId, activityId }, supabase] = await Promise.all([
    params.params,
    createSupabaseServerClient(),
  ]);
  const [
    { data: agent },
    favorites,
    documentRepositories,
    models,
    { claims: workspaces },
  ] = await Promise.all([
    tryAsync(() => getAgentById(agentId, { supabase })),
    getCurrentUserConfigFavorites(),
    getDocumentRepositories(),
    getAIModels(),
    getWorkspaceClaims(),
  ]);

  if (!agent) {
    notFound();
  }

  const documentRepositoryMap = new Map(
    documentRepositories.map((repo) => [repo.identifier, repo]),
  );

  const modelMap = new Map(models.map((model) => [model.identifier, model]));

  return (
    <>
      <HeaderMain appColor={agent?.color}>
        <HeaderMainContent>
          <BotMessageSquare />
          {agent?.name}
        </HeaderMainContent>
      </HeaderMain>

      <TabsChat
        activityId={activityId}
        agentId={agentId}
        pathSegment="info"
        hasDocumentation={Boolean(agent.documentation?.trim())}
      />

      <AgentInfo
        agent={agent}
        documentRepositoryMap={documentRepositoryMap}
        favorites={favorites}
        editAgentPathname={`/agent/${agent.id}/edit`}
        editDefaultAgent={agent}
        editable={true}
        modelMap={modelMap}
        workspace={workspaces.find(
          (workspace) => workspace.id === agent.workspaceId,
        )}
      />
    </>
  );
}
