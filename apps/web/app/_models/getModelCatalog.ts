import { notFound } from "next/navigation";
import { toModelSummary } from "../(settings)/models/modelSummary";
import { canAdministerWorkspaces } from "./canAdministerWorkspaces";
import { getAIModels } from "./getAIModels";
import { getWorkspaceClaims } from "./getWorkspaceClaims";

export async function getModelCatalog() {
  const access = await getWorkspaceClaims();
  if (!canAdministerWorkspaces(access)) notFound();
  const models = await getAIModels();
  return {
    models: models.map((model) =>
      toModelSummary(model, { includeConnectionDetails: access.isAdmin }),
    ),
    readOnly: !access.isAdmin,
  };
}
