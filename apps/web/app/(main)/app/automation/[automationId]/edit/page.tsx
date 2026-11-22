import { getAutomationPageData } from "../../_models/getAutomationPageData";
import { AutomationEditor } from "../../_components/AutomationEditor";
export default async function Page({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  const { automation, agents, repositories, models, workspaces, theme } =
    await getAutomationPageData(automationId);
  return (
    <AutomationEditor
      initial={automation}
      theme={theme}
      agents={agents}
      repositories={repositories}
      models={models}
      workspaces={workspaces}
    />
  );
}
