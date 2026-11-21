import { getGroupSortViewPreferences } from "@/lib/groupSortView/model";
import { getModelCatalog } from "../../_models/getModelCatalog";
import { ModelsOverview } from "./_components/ModelsOverview";

export default async function Page() {
  const [catalog, userPreferences] = await Promise.all([
    getModelCatalog(),
    getGroupSortViewPreferences("/models"),
  ]);
  return <ModelsOverview {...catalog} userPreferences={userPreferences} />;
}
