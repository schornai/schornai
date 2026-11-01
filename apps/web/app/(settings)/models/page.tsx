import { notFound } from "next/navigation";
import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getWorkspaceClaims } from "../../_models/getWorkspaceClaims";
import { getAIModels } from "../../_models/getAIModels";
import { ModelsOverview } from "./_components/ModelsOverview";
import { toModelSummary } from "./modelSummary";

export default async function Page() {
  if (!(await getWorkspaceClaims()).isAdmin) notFound();
  const [models, userPreferences] = await Promise.all([
    getAIModels(),
    getGroupSortViewPreferences("/models"),
  ]);
  return (
    <ModelsOverview
      models={models.map(toModelSummary)}
      userPreferences={userPreferences}
    />
  );
}
