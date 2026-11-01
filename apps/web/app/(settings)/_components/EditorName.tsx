"use client";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { useId, useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { InputChangeIndicator } from "../../_components/InputChangeIndicator";
import { updateProfileName } from "../_actions/updateProfileName";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function EditorName({
  defaultFirstName,
  defaultLastName,
  targetUserId,
}: {
  defaultFirstName?: string;
  defaultLastName?: string;
  targetUserId?: string;
}) {
  const idFirstName = useId();
  const idLastName = useId();

  const { t } = useT("me", { keyPrefix: "_components.EditorName" });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(updateProfileName, actionUtils);

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);

  const hasChanges =
    firstName !== defaultFirstName || lastName !== defaultLastName;

  return (
    <ContainerMain>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          execute({ firstName, lastName, targetUserId });
        }}
      >
        <FieldGroup>
          <FieldSet>
            <FieldLegend>{t("fieldGroupName")}</FieldLegend>
          </FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={idFirstName}>
                {t("labelFirstName")}
              </FieldLabel>
              <InputChangeIndicator
                autoComplete="given-name"
                defaultValue={defaultFirstName}
                id={idFirstName}
                onChange={(event) => setFirstName(event.currentTarget.value)}
                value={firstName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={idLastName}>{t("labelLastName")}</FieldLabel>
              <InputChangeIndicator
                autoComplete="family-name"
                defaultValue={defaultLastName}
                id={idLastName}
                onChange={(event) => setLastName(event.currentTarget.value)}
                value={lastName}
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
                setFirstName(defaultFirstName);
                setLastName(defaultLastName);
              }}
              variant="outline"
            >
              {t("buttonReset")}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </ContainerMain>
  );
}
