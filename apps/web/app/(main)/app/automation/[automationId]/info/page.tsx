import { getAutomationPageData } from "../../_models/getAutomationPageData";
import { AutomationInfo } from "../../_components/AutomationInfo";
import { AutomationDetailHeader } from "../../_components/AutomationDetailHeader";
export default async function Page({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  const data = await getAutomationPageData(automationId);
  return (
    <>
      <AutomationDetailHeader automation={data.automation!} view="info" />
      <AutomationInfo
        showResourceActions
        automation={data.automation!}
        favorites={data.favorites}
        agents={data.agents}
        repositories={data.repositories}
        workspace={data.workspaces.find(
          (workspace) =>
            workspace.id ===
            data.agents.find((agent) => agent.id === data.automation!.agentId)
              ?.workspaceId,
        )}
        editable
      />
    </>
  );
}
