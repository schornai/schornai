"use client";

import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { Download } from "lucide-react";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { exportXRAG } from "../../(main)/app/xrag/_actions/exportXRAG";

import type { XRAGPackageObject } from "@schornio/aibox-package-database/xrag/packageSchema";

export function XRAGExportButton({
  id,
  kind,
}: Pick<XRAGPackageObject, "kind" | "id">) {
  const { t } = useT("common", { keyPrefix: "_components.XRAGExportButton" });
  const archive = useAction(exportXRAG, {
    onSuccess: ({ data }) => {
      if (data) window.location.assign(data.url);
    },
  });
  return (
    <>
      <ButtonAction
        variant="outline"
        isPending={archive.isPending}
        hasErrored={archive.hasErrored}
        hasSucceeded={archive.hasSucceeded}
        onClick={() => archive.execute({ kind, id })}
      >
        <Download /> {t("labelExport")}
      </ButtonAction>
      {archive.hasErrored && (
        <Alert variant="destructive">
          <AlertDescription>{t("errorAction")}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
