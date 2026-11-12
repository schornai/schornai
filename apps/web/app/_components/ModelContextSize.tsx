"use client";
import { useT } from "next-i18next/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@schornio/aibox-package-ui/components/tooltip";

export function ModelContextSize({ contextSize }: { contextSize?: number }) {
  const { t } = useT("settings", { keyPrefix: "models" });
  if (contextSize)
    return <span>{t("labelContextTokens", { size: contextSize })}</span>;
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} className="text-destructive" />}
      >
        {t("labelContextUnknown")}
      </TooltipTrigger>
      <TooltipContent>{t("descriptionCompressionDisabled")}</TooltipContent>
    </Tooltip>
  );
}
