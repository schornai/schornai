import { ModelEditor } from "../_components/ModelEditor";
import { notFound } from "next/navigation";
import { getModelCatalog } from "../../../_models/getModelCatalog";

export default async function Page({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const [{ modelId }, { models, readOnly }] = await Promise.all([
    params,
    getModelCatalog(),
  ]);
  const model = models.find((item) => item.id === modelId);
  if (!model) notFound();
  return <ModelEditor model={model} readOnly={readOnly} />;
}
