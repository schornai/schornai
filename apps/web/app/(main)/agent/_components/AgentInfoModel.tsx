"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import { Brain, Camera, ChevronsUpDown, Pencil } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import type { AIModel } from "@schornio/aibox-package-database/aiModel/_types";
import type { Agent } from "@schornio/aibox-package-database/agent/_types";
import { Badge } from "@schornio/aibox-package-ui/components/badge";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { CodeInline } from "@schornio/aibox-package-ui/components/code-inline";
import { InfoActions } from "../../../_components/InfoActions";
import { InfoTitle } from "../../../_components/InfoTitle";
import Link from "next/link";
import { MarkdownProse } from "@schornio/aibox-package-ui/components/markdown-prose";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { composite } from "@schornio/aibox-package-utils/composite";
import { useT } from "next-i18next/client";

export function AgentInfoModel({
  editAgentPathname,
  editDefaultModelIdentifier,
  editDefaultModelThinking,
  editRoleId,
  editable,
  modelIdentifier,
  modelThinking,
  model,
}: {
  editAgentPathname?: string;
  editDefaultModelIdentifier?: string;
  editDefaultModelThinking?: Agent["modelThinking"];
  editRoleId?: string;
  editable?: boolean;
  modelIdentifier: string;
  modelThinking?: Agent["modelThinking"];
  model?: AIModel;
}) {
  const { t } = useT("agent", { keyPrefix: "_components.AgentInfoModel" });

  const modelLLM =
    model?.type === "ollama_llm_v1" || model?.type === "external_llm_v1"
      ? model
      : undefined;

  const changed =
    editable &&
    composite([editDefaultModelIdentifier, editDefaultModelThinking]) !==
      composite([modelIdentifier, modelThinking]);

  return (
    <Alert className={cn({ "border-foreground border-dashed": changed })}>
      <Brain />
      <Collapsible>
        <InfoTitle>
          <CollapsibleTrigger className="flex-1 text-left">
            {t("labelTitle")}
          </CollapsibleTrigger>
          <InfoActions>
            {changed ? <Badge>{t("labelChanged")}</Badge> : undefined}

            {editable ? (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={
                      editRoleId
                        ? `${editAgentPathname ?? ""}?view=roles&role-${editRoleId}=settings#role-${editRoleId}-model-override`
                        : `${editAgentPathname ?? ""}?view=settings#model`
                    }
                  />
                }
                size="icon-xs"
                variant="ghost"
              >
                <Pencil />
              </Button>
            ) : undefined}
            <CollapsibleTrigger
              render={
                <Button size="icon-xs" variant="ghost">
                  <ChevronsUpDown />
                </Button>
              }
            />
          </InfoActions>
        </InfoTitle>

        <AlertDescription>
          <strong>{modelLLM?.name ?? t("labelUnknownModel")}</strong>
          <CollapsibleContent>
            {modelLLM ? (
              <>
                <ul>
                  <li>
                    <Brain className="inline size-4" />{" "}
                    {modelThinking === "optional-on"
                      ? t("labelThinkingOptionalOn")
                      : undefined}
                    {modelThinking === "mandatory-on"
                      ? t("labelThinkingMandatoryOn")
                      : undefined}
                    {modelThinking === "optional-off"
                      ? t("labelThinkingOptionalOff")
                      : undefined}
                    {modelThinking === "mandatory-off"
                      ? t("labelThinkingMandatoryOff")
                      : undefined}
                  </li>
                  {modelLLM.type === "ollama_llm_v1" &&
                  modelLLM.config.featureVision ? (
                    <li>
                      <Camera className="inline size-4" />{" "}
                      {t("descriptionFeatureVision")}
                    </li>
                  ) : undefined}
                  {modelLLM.type === "ollama_llm_v1" ? (
                    <li>
                      {t("labelModelSize", {
                        size: modelLLM.config.contextSize,
                      })}
                    </li>
                  ) : undefined}
                </ul>

                {modelLLM.image ? (
                  <div className="bg-muted my-3 aspect-video max-w-xs overflow-hidden rounded-md">
                    <img
                      alt=""
                      className="h-full w-full object-contain"
                      height={180}
                      src={`/api/storage/model_images/${modelLLM.image.path}`}
                      width={320}
                    />
                  </div>
                ) : undefined}

                {modelLLM.description && modelLLM.description.length > 0 ? (
                  <MarkdownProse className="mt-3 max-w-none">
                    {modelLLM.description}
                  </MarkdownProse>
                ) : undefined}
              </>
            ) : (
              <ul>
                <li className="text-destructive">{t("labelNotFound")}</li>
                <li>
                  <CodeInline>{modelIdentifier}</CodeInline>
                </li>
              </ul>
            )}
          </CollapsibleContent>
        </AlertDescription>
      </Collapsible>
    </Alert>
  );
}
