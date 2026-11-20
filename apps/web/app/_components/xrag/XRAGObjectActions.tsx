"use client";
import type { XRAGPackageObject } from "@schornio/aibox-package-database/xrag/packageSchema";
import { Separator } from "@schornio/aibox-package-ui/components/separator";
import { XRAGExportButton } from "./XRAGExportButton";
import { XRAGPackageAddDialog } from "./XRAGPackageAddDialog";

export function XRAGObjectActions(
  selection: Pick<XRAGPackageObject, "kind" | "id">,
) {
  return (
    <div className="col-span-full flex flex-col gap-4">
      <Separator />
      <div className="flex flex-wrap justify-center gap-2">
        <XRAGExportButton {...selection} />
        <XRAGPackageAddDialog {...selection} />
      </div>
    </div>
  );
}
