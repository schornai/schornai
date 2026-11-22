import { getAutomationPageData } from "../_models/getAutomationPageData";
import { AutomationEditor } from "../_components/AutomationEditor";
export default async function Page() {
  const { agents, repositories, models, workspaces, theme } =
    await getAutomationPageData();
  return (
    <AutomationEditor
      theme={theme}
      agents={agents}
      repositories={repositories}
      models={models}
      workspaces={workspaces}
    />
  );
}
