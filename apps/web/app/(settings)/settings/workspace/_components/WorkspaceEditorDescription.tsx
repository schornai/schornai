"use client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { useId, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ButtonDiscardChanges } from "@schornio/aibox-package-ui/components/button-discard-changes";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import { updateDescription } from "../_actions/updateDescription";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function WorkspaceEditorDescription({
  defaultDescription,
  defaultName,
  workspaceId,
}: {
  defaultDescription?: string;
  defaultName?: string;
  workspaceId: string;
}) {
  const nameInputId = useId();
  const descriptionInputId = useId();

  const { t } = useT("workspace", {
    keyPrefix: "_components.WorkspaceEditorDescription",
  });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateDescription, actionUtils);

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);

  const hasChanges = name !== defaultName || description !== defaultDescription;

  return (
    <ContainerMain>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          execute({ description, name, workspaceId });
        }}
      >
        <FieldSet>
          <FieldLegend>{t("legend")}</FieldLegend>
          <FieldDescription>{t("description")}</FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={nameInputId}>
                {t("labelName")}{" "}
                <ButtonDiscardChanges
                  objA={defaultName}
                  objB={name}
                  onClick={() => setName(defaultName)}
                  variant="inline"
                />
              </FieldLabel>
              <Input
                id={nameInputId}
                onChange={(event) => setName(event.currentTarget.value)}
                value={name ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={descriptionInputId}>
                {t("labelDescription")}{" "}
                <ButtonDiscardChanges
                  objA={defaultDescription}
                  objB={description}
                  onClick={() => setDescription(defaultDescription)}
                  variant="inline"
                />
              </FieldLabel>
              <Textarea
                id={descriptionInputId}
                onChange={(event) => setDescription(event.currentTarget.value)}
                value={description ?? ""}
              />
            </Field>
          </FieldGroup>
          <Field orientation="horizontal">
            <ButtonAction
              disabled={!hasChanges}
              hasErrored={hasErrored}
              hasSucceeded={hasSucceeded}
              isPending={isPending}
              type="submit"
            >
              <ArrowDownToLine /> {t("buttonSave")}
            </ButtonAction>
            <Button
              disabled={!hasChanges}
              onClick={() => {
                setName(defaultName);
                setDescription(defaultDescription);
              }}
              variant="outline"
            >
              {t("buttonReset")}
            </Button>
          </Field>
        </FieldSet>
      </form>
    </ContainerMain>
  );
}
