import { getAutomationPageData } from "../_models/getAutomationPageData";
import { AutomationEditor } from "../_components/AutomationEditor";
export default async function Page() {
  const { agents, repositories, models, workspaces, favorites, theme } =
    await getAutomationPageData();
  return (
    <AutomationEditor
      favorites={favorites}
      theme={theme}
      agents={agents}
      repositories={repositories}
      models={models}
      workspaces={workspaces}
    />
  );
}
