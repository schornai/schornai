import type { DocumentName } from "../../_lib/DocumentName.ts";

export function getTaskQueueDocumentName() {
  return "taskQueue" as DocumentName;
}

export function hasCapabilities({
  check,
  required,
}: {
  check: string[];
  required: string[];
}) {
  const checkSet = new Set(check);
  const requiredSet = new Set(required);
  return requiredSet.isSubsetOf(checkSet);
}
