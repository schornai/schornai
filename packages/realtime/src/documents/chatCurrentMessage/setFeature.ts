import type { ChatFeatures } from "@schornio/aibox-database/chat/_types";
import { TypedYMap } from "../../_lib/TypedYMap.ts";
import type { Doc as YDoc } from "yjs";

export function setFeature<TKey extends keyof ChatFeatures>(
  document: YDoc | undefined,
  newFeatureKey: TKey,
  newFeatureValue: ChatFeatures[TKey],
) {
  const features = document
    ? new TypedYMap<ChatFeatures>(document.getMap("features"))
    : undefined;

  document?.transact(() => {
    features?.set(newFeatureKey, newFeatureValue);
  });
}
