"use client";
import { ModelContextSize } from "../../../_components/ModelContextSize";
import { Brain, Pencil } from "lucide-react";
import Link from "next/link";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import type { ModelSummary } from "../modelSummary";
import {
  CardApp,
  CardAppHeader,
  CardAppMain,
  CardAppAvatar,
  CardAppContent,
  CardAppName,
  CardAppDescription,
  CardAppFooter,
} from "@schornio/aibox-package-ui/components/card-app";

export function ModelCard({ model }: { model: ModelSummary }) {
  const { t } = useT("settings", { keyPrefix: "models" });
  const external = model.type === "external_llm_v1";
  return (
    <CardApp className="max-w-full">
      <CardAppHeader>
        <Brain />
        {t(`types.${model.type}`)} ·{" "}
        {t(external ? "labelExternalOrigin" : "labelInternalOrigin")}
      </CardAppHeader>
      <CardAppMain
        render={<Link href={`/models/${encodeURIComponent(model.id)}`} />}
      >
        <CardAppAvatar icon={{ type: "icon-lucide", iconName: "brain" }} />
        <CardAppContent className="min-w-0 pr-3">
          <CardAppName className="break-words">{model.name}</CardAppName>
          <CardAppDescription className="break-all">
            {model.modelId || model.identifier}
          </CardAppDescription>
        </CardAppContent>
      </CardAppMain>
      <CardAppFooter
        className={
          model.type === "ollama_llm_v1" || external
            ? "justify-between"
            : "justify-end"
        }
      >
        {(model.type === "ollama_llm_v1" || external) && (
          <span className="self-center text-xs">
            <ModelContextSize contextSize={model.contextSize} />
          </span>
        )}
        <Button
          nativeButton={false}
          render={
            <Link
              href={`/models/${encodeURIComponent(model.id)}?view=settings`}
            />
          }
          size="icon-xs"
          variant="ghost"
          aria-label={t("labelEditName")}
        >
          <Pencil />
        </Button>
      </CardAppFooter>
    </CardApp>
  );
}
