import { ModelEditor } from "../_components/ModelEditor";
import { notFound } from "next/navigation";
import { getWorkspaceClaims } from "../../../_models/getWorkspaceClaims";
import { getAIModels } from "../../../_models/getAIModels";
import { toModelSummary } from "../modelSummary";

export default async function Page({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  if (!(await getWorkspaceClaims()).isAdmin) notFound();
  const { modelId } = await params;
  const model = (await getAIModels()).find((item) => item.id === modelId);
  if (!model) notFound();
  return <ModelEditor model={toModelSummary(model)} />;
}
