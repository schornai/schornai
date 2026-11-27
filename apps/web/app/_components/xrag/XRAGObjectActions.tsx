"use client";
import type { XRAGPackageObject } from "@schornio/aibox-package-database/xrag/packageSchema";
import { XRAGExportButton } from "./XRAGExportButton";
import { XRAGPackageAddDialog } from "./XRAGPackageAddDialog";

export function XRAGObjectActions(
  selection: Pick<XRAGPackageObject, "kind" | "id">,
) {
  return (
    <>
      <XRAGExportButton {...selection} />
      <XRAGPackageAddDialog {...selection} />
    </>
  );
}
