import { getServiceFixture } from "../../../service-fixtures";
import { z } from "zod/mini";
export const defaultModelSchema = z.object({
  modelIdentifier: z.string(),
  version: z.literal("default-model-v2"),
});
export const getSystemConfigDefaultModel = async () =>
  getServiceFixture("getSystemConfigDefaultModel", {
    modelIdentifier: "example-model",
    version: "default-model-v2",
  });
