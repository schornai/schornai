import { getAgentConnections } from "../../../../_models/getAgentConnections";
import { AgentEditor } from "../../_components/AgentEditor";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getAIModels } from "../../../../_models/getAIModels";
import { getAgentById } from "@schornio/aibox-package-database/agent/getAgentById";
import { getCurrentUserConfigFavorites } from "../../../../_models/currentUserConfigFavorites";
import { getDocumentRepositories } from "../../../../_models/getDocumentRepositories";
import { getSystemConfigTheme } from "../../../../_models/systemConfigTheme";
import { getWorkspaceClaims } from "../../../../_models/getWorkspaceClaims";
import { notFound } from "next/navigation";
import { tryAsync } from "@schornio/aibox-package-utils/tryAsync";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";

export default async function Page(params: PageProps<"/agent/[agentId]/edit">) {
  const [{ agentId }, supabase] = await Promise.all([
    params.params,
    createSupabaseServerClient(),
  ]);
  const [
    { data: agent },
    favorites,
    connections,
    documentRepositories,
    models,
    transcribers,
    theme,
    { claims: workspaces },
  ] = await Promise.all([
    tryAsync(() => getAgentById(agentId, { supabase })),
    getCurrentUserConfigFavorites(),
    getAgentConnections(),
    getDocumentRepositories(),
    getAIModels(),
    getTranscribers({ supabase }),
    getSystemConfigTheme(),
    getWorkspaceClaims(),
  ]);

  if (!agent) {
    notFound();
  }

  return (
    <AgentEditor
      agent={agent}
      mode="update"
      favorites={favorites}
      relations={{
        connections,
        documentRepositories,
        models,
        transcribers,
        theme,
        workspaces,
      }}
    />
  );
}
