"use client";

import { BadgeCheck, BadgeMinus } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { ContainerMain } from "@schornio/aibox-package-ui/components/container-main";
import { toggleAdmin } from "../../_actions/toggleAdmin";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function UserEditorAdmin({
  isAdmin,
  userId,
}: {
  isAdmin: boolean;
  userId: string;
}) {
  const { t } = useT("settings", { keyPrefix: "_components.UserEditorAdmin" });
  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending, result } = useAction(toggleAdmin, actionUtils);

  return (
    <ContainerMain>
      <FieldSet>
        <FieldLegend>{t("labelTitle")}</FieldLegend>
        <FieldDescription>
          {t(isAdmin ? "descriptionAdmin" : "descriptionUser")}
        </FieldDescription>
        <FieldDescription>{t("descriptionSession")}</FieldDescription>
        <FieldGroup>
          <Field orientation="horizontal">
            <ButtonAction
              type="button"
              variant="outline"
              hasErrored={hasErrored}
              hasSucceeded={hasSucceeded}
              isPending={isPending}
              onClick={() =>
                execute({
                  toggle: isAdmin ? "demoteFromAdmin" : "promoteToAdmin",
                  userId,
                })
              }
            >
              {isAdmin ? (
                <BadgeMinus data-icon="inline-start" />
              ) : (
                <BadgeCheck data-icon="inline-start" />
              )}
              {t(isAdmin ? "labelDemote" : "labelPromote")}
            </ButtonAction>
          </Field>
          {result.serverError || result.validationErrors ? (
            <FieldError>{t("errorSave")}</FieldError>
          ) : null}
        </FieldGroup>
      </FieldSet>
    </ContainerMain>
  );
}
