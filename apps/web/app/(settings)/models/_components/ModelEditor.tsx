"use client";
import { Brain, Settings2, FilePenLine } from "lucide-react";
import { useT } from "next-i18next/client";
import {
  HeaderMain,
  HeaderMainContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  TabsMainList,
  TabsMainTrigger,
  TabsMainContent,
} from "../../../_components/TabsMain";
import type { ModelSummary } from "../modelSummary";
import { ModelDetails } from "./ModelDetails";
import { ModelMetadataForm } from "./ModelMetadataForm";
import { ExternalModelForm } from "./ExternalModelForm";

export function ModelEditor({
  model,
  readOnly,
}: {
  model: ModelSummary;
  readOnly?: boolean;
}) {
  const { t } = useT("settings", { keyPrefix: "models" });
  const external = model.type === "external_llm_v1" && model.provider;
  const overview = (
    <ContainerMain>
      <ModelDetails model={model} readOnly={readOnly} />
    </ContainerMain>
  );
  return (
    <>
      <HeaderMain>
        <HeaderMainContent>
          <Brain />
          {model.name}
        </HeaderMainContent>
      </HeaderMain>
      {readOnly ? (
        overview
      ) : (
        <>
          <TabsMainList stickyTop>
            <TabsMainTrigger view="default">
              <Brain />
              {t("tabOverview")}
            </TabsMainTrigger>
            {external && (
              <TabsMainTrigger view="connection">
                <Settings2 />
                {t("labelConnection")}
              </TabsMainTrigger>
            )}
            <TabsMainTrigger view="settings">
              <FilePenLine />
              {t("tabMetadata")}
            </TabsMainTrigger>
          </TabsMainList>
          <TabsMainContent view="default">{overview}</TabsMainContent>
          {external && (
            <TabsMainContent view="connection">
              <ContainerMain>
                <ExternalModelForm provider={external} initial={model} />
              </ContainerMain>
            </TabsMainContent>
          )}
          <TabsMainContent view="settings">
            <ModelMetadataForm model={model} />
          </TabsMainContent>
        </>
      )}
    </>
  );
}
