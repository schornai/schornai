"use client";
import { useId } from "react";
import { useT } from "next-i18next/client";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { XRAGIdentitySettings } from "../../../_components/xrag/XRAGIdentitySettings";
import { useAgentEditor } from "./AgentEditor";
import { AgentEditorSettingsAdditionalFunctions } from "./AgentEditorSettingsAdditionalFunctions";
import { AgentEditorSettingsAppearance } from "./AgentEditorSettingsAppearance";
import { AgentEditorSettingsDescription } from "./AgentEditorSettingsDescription";
import { AgentEditorSettingsModel } from "./AgentEditorSettingsModel";
import { AgentEditorSettingsWorkspace } from "./AgentEditorSettingsWorkspace";

export function AgentEditorSettings({
  draftIdentity,
}: {
  draftIdentity?: {
    value: string;
    suggestion: string;
    onChange: (value: string | undefined) => void;
    error?: "errorGlobalId" | "errorGlobalIdTaken";
  };
}) {
  const id = useId();
  const { t } = useT("common", { keyPrefix: "_components.XRAGExportButton" });
  const { defaultAgent } = useAgentEditor();
  return (
    <>
      <AgentEditorSettingsDescription />
      {draftIdentity && (
        <ContainerMain>
          <Field>
            <FieldLabel htmlFor={id}>{t("labelGlobalId")}</FieldLabel>
            <Input
              id={id}
              value={draftIdentity.value}
              placeholder={draftIdentity.suggestion}
              aria-invalid={Boolean(draftIdentity.error)}
              aria-describedby={draftIdentity.error ? id + "-error" : undefined}
              onChange={(e) => draftIdentity.onChange(e.target.value)}
              onBlur={() => {
                if (!draftIdentity.value) draftIdentity.onChange(undefined);
              }}
            />
            {draftIdentity.error && (
              <FieldError id={id + "-error"}>
                {t(draftIdentity.error)}
              </FieldError>
            )}
          </Field>
        </ContainerMain>
      )}

      <hr className="my-10" />

      <AgentEditorSettingsAdditionalFunctions />

      <hr className="my-10" />

      <AgentEditorSettingsAppearance />

      <hr className="my-10" />

      <AgentEditorSettingsModel />

      <hr className="my-10" />

      <AgentEditorSettingsWorkspace />

      {!draftIdentity && defaultAgent?.id && (
        <>
          <hr className="my-10" />
          <XRAGIdentitySettings kind="agent" id={defaultAgent.id} />
        </>
      )}
    </>
  );
}
