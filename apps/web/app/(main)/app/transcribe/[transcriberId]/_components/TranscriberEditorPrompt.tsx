"use client";

import {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { useT } from "next-i18next/client";
import { useTranscriberEditor } from "./TranscriberEditor";

export function TranscriberEditorPrompt() {
  const { transcriber, defaultTranscriber, setTranscriber } =
    useTranscriberEditor();
  const { t } = useT("transcriber", {
    keyPrefix: "_components.TranscriberEditorPrompt",
  });

  return (
    <ContainerMain className="scroll-mt-32" id="prompt">
      <FieldSet>
        <FieldLegend>
          {t("labelPrompt")}{" "}
          <ButtonDiscardChanges
            objA={defaultTranscriber?.prompt}
            objB={transcriber?.prompt}
            onClick={() =>
              setTranscriber((prev) => ({
                ...prev,
                prompt: defaultTranscriber?.prompt,
              }))
            }
            variant="inline"
          />
        </FieldLegend>
         <FieldDescription>{t("descriptionWhisperPrompt")}</FieldDescription>
        <Field className="flex-1">
          <Textarea
            className="min-h-[40ch] font-mono"
            onChange={({ currentTarget: { value } }) =>
              setTranscriber((prev) => ({ ...prev, prompt: value }))
            }
            value={transcriber?.prompt ?? ""}
          />
        </Field>
      </FieldSet>
    </ContainerMain>
  );
}
