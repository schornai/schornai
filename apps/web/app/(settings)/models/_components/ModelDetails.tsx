"use client";
import { XRAGObjectActions } from "../../../_components/xrag/XRAGObjectActions";
import { ModelContextSize } from "../../../_components/ModelContextSize";
import { Brain, Book, Settings2, ChevronsUpDown, Pencil } from "lucide-react";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@schornio/aibox-package-ui/components/collapsible";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { InfoTitle } from "../../../_components/InfoTitle";
import { InfoActions } from "../../../_components/InfoActions";
import { useT } from "next-i18next/client";
import { providers } from "../providers";
import { ModelRemove } from "./ModelRemove";
import { ResourceInfoLayout } from "../../../_components/ResourceInfoLayout";
import { ModelCard } from "./ModelCard";
import type { ModelSummary } from "../modelSummary";

export function ModelDetails({
  model,
  readOnly,
}: {
  model: ModelSummary;
  readOnly?: boolean;
}) {
  const { t } = useT("settings", { keyPrefix: "models" });
  const external = model.type === "external_llm_v1";
  const details = [
    [t("labelType"), t(`types.${model.type}`)],
    [t("labelIdentifier"), model.modelId || model.identifier],
    ...(model.type === "external_llm_v1" || model.type === "ollama_llm_v1"
      ? []
      : [[t("labelContextSize"), model.contextSize]]),
    [t("labelEmbeddingSize"), model.embeddingVectorSize],
    [t("labelFileSystemIdentifier"), model.fileSystemIdentifier],
    ...(["featureThinking", "featureTools", "featureVision"] as const)
      .filter((key) => model[key] !== undefined)
      .map((key) => [t(key), t(model[key] ? "labelYes" : "labelNo")]),
  ];
  const sections = [
    {
      title: t("labelModelProperties"),
      icon: Brain,
      summary: model.modelId || model.identifier,
      content: (
        <dl className="grid gap-3 sm:grid-cols-2">
          {(model.type === "external_llm_v1" ||
            model.type === "ollama_llm_v1") && (
            <div>
              <dt>{t("labelContextSize")}</dt>
              <dd>
                <ModelContextSize contextSize={model.contextSize} />
              </dd>
            </div>
          )}
          {details
            .filter(([, value]) => value !== undefined)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="text-foreground break-all">{value}</dd>
              </div>
            ))}
        </dl>
      ),
    },
    ...(external && !readOnly
      ? [
          {
            title: t("labelConnection"),
            icon: Settings2,
            summary: model.provider
              ? providers[model.provider].name
              : undefined,
            edit: "connection",
            content: (
              <dl className="flex flex-col gap-3">
                <div>
                  <dt>{t("labelBaseUrl")}</dt>
                  <dd className="text-foreground break-all">{model.baseUrl}</dd>
                </div>
                {model.region && (
                  <div>
                    <dt>{t("fields.region")}</dt>
                    <dd>{model.region}</dd>
                  </div>
                )}
              </dl>
            ),
          },
        ]
      : []),
    {
      title: t("fields.documentation"),
      icon: Book,
      edit: "settings",
      content: model.description ? (
        <MarkdownProse className="max-w-none">
          {model.description}
        </MarkdownProse>
      ) : (
        <p>{t("descriptionNoDocumentation")}</p>
      ),
    },
  ];
  return (
    <ResourceInfoLayout
      card={<ModelCard model={model} readOnly={readOnly} />}
      actions={
        <>
          {!external && <XRAGObjectActions kind="model" id={model.id} />}
          {!readOnly && (
            <>
              <Button
                nativeButton={false}
                render={<Link href="?view=settings" />}
                variant="outline"
              >
                <Pencil />
                {t("tabMetadata")}
              </Button>
              <ModelRemove model={model} />
            </>
          )}
        </>
      }
    >
      {sections.map(({ title, icon: Icon, summary, content, edit }) => (
        <Alert key={title}>
          <Icon />
          <Collapsible>
            <InfoTitle>
              <CollapsibleTrigger className="flex-1 text-left">
                {title}
              </CollapsibleTrigger>
              <InfoActions>
                {edit && !readOnly && (
                  <Button
                    nativeButton={false}
                    render={<Link href={`?view=${edit}`} />}
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t("labelEditSection", { section: title })}
                  >
                    <Pencil />
                  </Button>
                )}
                <CollapsibleTrigger
                  render={
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label={t("labelToggleSection", { section: title })}
                    >
                      <ChevronsUpDown />
                    </Button>
                  }
                />
              </InfoActions>
            </InfoTitle>
            <AlertDescription>
              {summary && <strong className="break-all">{summary}</strong>}
              <CollapsibleContent>
                <div className="pt-3">{content}</div>
              </CollapsibleContent>
            </AlertDescription>
          </Collapsible>
        </Alert>
      ))}
    </ResourceInfoLayout>
  );
}
