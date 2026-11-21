import { getAutomationRuns } from "@schornio/aibox-package-database/automation/getAutomationRuns";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getAutomationPageData } from "../../_models/getAutomationPageData";
import { AutomationRunsLive } from "../../_components/AutomationRunsLive";
export default async function Page({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  const { automation, context } = await getAutomationPageData(automationId);
  const [runs, userPreferences] = await Promise.all([
    getAutomationRuns(automationId, context),
    getGroupSortViewPreferences("/app/automation/runs"),
  ]);
  return (
    <AutomationRunsLive
      automation={automation!}
      runs={runs}
      userPreferences={userPreferences}
    />
  );
}
