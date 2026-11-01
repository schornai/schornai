import { getAgentConnections } from "../../../_models/getAgentConnections";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { AgentEditor } from "../_components/AgentEditor";
import { defaultAgentIcons } from "@/lib/defaultAgentIcons";
import { defaultColors } from "@/lib/defaultColors";
import { getAIModels } from "../../../_models/getAIModels";
import { getDocumentRepositories } from "../../../_models/getDocumentRepositories";
import { getSystemConfigTheme } from "../../../_models/systemConfigTheme";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { pickRandom } from "@schornio/aibox-package-utils/pickRandom";
import { createSupabaseServerClient } from "@/lib/supabase/createSupabaseServerClient";
import { getTranscribers } from "@schornio/aibox-package-database/transcriber/getTranscribers";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const [
    connections,
    documentRepositories,
    models,
    transcribers,
    theme,
    { claims: workspaces },
  ] = await Promise.all([
    getAgentConnections(),
    getDocumentRepositories(),
    getAIModels(),
    getTranscribers({ supabase }),
    getSystemConfigTheme(),
    getWorkspaceClaims(),
  ]);

  const defaultAgent: Partial<Agent> = {
    additionalFunctions: {
      batch: true,
      disappearingChats: true,
      fileUpload: true,
      nightshift: true,
      pursueGoal: true,
    },
    color: pickRandom(
      (theme.colors ?? defaultColors).map(({ color }) => color),
      {
        oklchHue: 0,
        type: "color-oklch-hue",
      },
    ),
    description: "",
    documentation: "",
    icon: { iconName: pickRandom(defaultAgentIcons, "x"), type: "icon-lucide" },
    id: crypto.randomUUID(),
    modelThinking: "optional-on",
    name: "",
    recommendedMessages: [],
    roles: [
      {
        documentRepositoryMounts: [],
        id: crypto.randomUUID(),
        prompt: "",
      },
    ],
    version: "agent-config-version-4",
  };

  return (
    <AgentEditor
      agent={defaultAgent}
      mode="create"
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
