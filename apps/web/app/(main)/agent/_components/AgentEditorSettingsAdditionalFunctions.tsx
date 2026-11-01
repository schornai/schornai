"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { Layers, Paperclip } from "lucide-react";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Switch } from "@schornio/aibox-package-ui/components/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { defaultAgentEnabledAdditionalFunctions } from "@/lib/defaultAgentEnabledAdditionalFunctions";
import { useAgentEditor } from "./AgentEditor";
import { useId } from "react";
import { useT } from "next-i18next/client";

export function AgentEditorSettingsAdditionalFunctions() {
  const switchFileUploadId = useId();
  const switchBatchId = useId();
  const transcriberSelectId = useId();
  // const switchPursueGoalId = useId();
  // const switchDisappearingChatsId = useId();
  // const switchNightshiftId = useId();

  const { t } = useT("agent", {
    keyPrefix: "_components.AgentEditorSettingsAdditionalFunctions",
  });
  const { agent, defaultAgent, relations, setAgent } = useAgentEditor();
  const transcriberItems = [
    { label: t("labelNoTranscriber"), value: null },
    ...(relations.transcribers ?? []).map((transcriber) => ({
      label: transcriber.name,
      value: transcriber.identifier,
    })),
  ];

  return (
    <ContainerMain id="additionalFunctions" className="scroll-mt-32">
      <FieldSet>
        <FieldLegend>{t("labelLegend")}</FieldLegend>
        <FieldDescription>{t("description")}</FieldDescription>
        <FieldGroup>
          <Field orientation="horizontal">
            <Switch
              checked={agent?.additionalFunctions?.fileUpload ?? true}
              id={switchFileUploadId}
              onCheckedChange={(checked) =>
                setAgent((prev) => ({
                  ...prev,
                  additionalFunctions: {
                    ...(prev?.additionalFunctions ??
                      defaultAgentEnabledAdditionalFunctions),
                    fileUpload: checked,
                  },
                }))
              }
            />
            <FieldContent>
              <FieldLabel htmlFor={switchFileUploadId}>
                <Paperclip className="inline size-4" /> {t("labelFileUpload")}{" "}
                <ButtonDiscardChanges
                  objA={defaultAgent?.additionalFunctions?.fileUpload}
                  objB={agent?.additionalFunctions?.fileUpload}
                  onClick={() =>
                    setAgent((prev) => ({
                      ...prev,
                      additionalFunctions: {
                        ...(prev?.additionalFunctions ??
                          defaultAgentEnabledAdditionalFunctions),
                        fileUpload:
                          defaultAgent?.additionalFunctions?.fileUpload ?? true,
                      },
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <FieldDescription>{t("descriptionFileUpload")}</FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Switch
              checked={agent?.additionalFunctions?.batch ?? true}
              id={switchBatchId}
              onCheckedChange={(checked) =>
                setAgent((prev) => ({
                  ...prev,
                  additionalFunctions: {
                    ...(prev?.additionalFunctions ??
                      defaultAgentEnabledAdditionalFunctions),
                    batch: checked,
                  },
                }))
              }
            />
            <FieldContent>
              <FieldLabel htmlFor={switchBatchId}>
                <Layers className="inline size-4" /> {t("labelBatch")}{" "}
                <ButtonDiscardChanges
                  objA={defaultAgent?.additionalFunctions?.batch}
                  objB={agent?.additionalFunctions?.batch}
                  onClick={() =>
                    setAgent((prev) => ({
                      ...prev,
                      additionalFunctions: {
                        ...(prev?.additionalFunctions ??
                          defaultAgentEnabledAdditionalFunctions),
                        batch: defaultAgent?.additionalFunctions?.batch ?? true,
                      },
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <FieldDescription>{t("descriptionBatch")}</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor={transcriberSelectId}>
              {t("labelTranscriber")}{" "}
              <ButtonDiscardChanges
                objA={defaultAgent?.transcriberIdentifier}
                objB={agent?.transcriberIdentifier}
                onClick={() =>
                  setAgent((prev) => ({
                    ...prev,
                    transcriberIdentifier: defaultAgent?.transcriberIdentifier,
                  }))
                }
                variant="inline"
              />
            </FieldLabel>
            <FieldDescription>{t("descriptionTranscriber")}</FieldDescription>
            <Select
              id={transcriberSelectId}
              items={transcriberItems}
              value={agent?.transcriberIdentifier ?? null}
              onValueChange={(value) =>
                setAgent((prev) => ({
                  ...prev,
                  transcriberIdentifier: value ?? undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {transcriberItems.map((item) => (
                    <SelectItem key={item.value ?? "none"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {/* <Field orientation="horizontal">
            <Switch
              checked={agent?.additionalFunctions?.pursueGoal ?? true}
              id={switchPursueGoalId}
              onCheckedChange={(checked) =>
                setAgent((prev) => ({
                  ...prev,
                  additionalFunctions: {
                    ...(prev?.additionalFunctions ??
                      defaultAgentEnabledAdditionalFunctions),
                    pursueGoal: checked,
                  },
                }))
              }
            />
            <FieldContent>
              <FieldLabel htmlFor={switchPursueGoalId}>
                <Goal className="inline size-4" /> {t("labelPursueGoal")}{" "}
                <ButtonDiscardChanges
                  objA={defaultAgent?.additionalFunctions?.pursueGoal}
                  objB={agent?.additionalFunctions?.pursueGoal}
                  onClick={() =>
                    setAgent((prev) => ({
                      ...prev,
                      additionalFunctions: {
                        ...(prev?.additionalFunctions ??
                          defaultAgentEnabledAdditionalFunctions),
                        pursueGoal:
                          defaultAgent?.additionalFunctions?.pursueGoal ?? true,
                      },
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <FieldDescription>{t("descriptionPursueGoal")}</FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Switch
              checked={agent?.additionalFunctions?.disappearingChats ?? true}
              id={switchDisappearingChatsId}
              onCheckedChange={(checked) =>
                setAgent((prev) => ({
                  ...prev,
                  additionalFunctions: {
                    ...(prev?.additionalFunctions ??
                      defaultAgentEnabledAdditionalFunctions),
                    disappearingChats: checked,
                  },
                }))
              }
            />
            <FieldContent>
              <FieldLabel htmlFor={switchDisappearingChatsId}>
                <ClockFading className="inline size-4" />{" "}
                {t("labelDisappearingChats")}{" "}
                <ButtonDiscardChanges
                  objA={defaultAgent?.additionalFunctions?.disappearingChats}
                  objB={agent?.additionalFunctions?.disappearingChats}
                  onClick={() =>
                    setAgent((prev) => ({
                      ...prev,
                      additionalFunctions: {
                        ...(prev?.additionalFunctions ??
                          defaultAgentEnabledAdditionalFunctions),
                        disappearingChats:
                          defaultAgent?.additionalFunctions
                            ?.disappearingChats ?? true,
                      },
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <FieldDescription>
                {t("descriptionDisappearingChats")}
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal">
            <Switch
              checked={agent?.additionalFunctions?.nightshift ?? true}
              id={switchNightshiftId}
              onCheckedChange={(checked) =>
                setAgent((prev) => ({
                  ...prev,
                  additionalFunctions: {
                    ...(prev?.additionalFunctions ??
                      defaultAgentEnabledAdditionalFunctions),
                    nightshift: checked,
                  },
                }))
              }
            />
            <FieldContent>
              <FieldLabel htmlFor={switchNightshiftId}>
                <MoonStar className="inline size-4" /> {t("labelNightshift")}{" "}
                <ButtonDiscardChanges
                  objA={defaultAgent?.additionalFunctions?.nightshift}
                  objB={agent?.additionalFunctions?.nightshift}
                  onClick={() =>
                    setAgent((prev) => ({
                      ...prev,
                      additionalFunctions: {
                        ...(prev?.additionalFunctions ??
                          defaultAgentEnabledAdditionalFunctions),
                        nightshift:
                          defaultAgent?.additionalFunctions?.nightshift ?? true,
                      },
                    }))
                  }
                  variant="inline"
                />
              </FieldLabel>
              <FieldDescription>{t("descriptionNightshift")}</FieldDescription>
            </FieldContent>
          </Field> */}
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
