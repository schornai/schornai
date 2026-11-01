"use client";

import {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { signInWithSSO } from "../_actions/signInWithSSO";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useT } from "next-i18next/client";

export function SSOSignIn({
  providerId,
  providerName = "SSO",
}: {
  providerId: string;
  providerName?: string;
}) {
  const { t } = useT("signIn", { keyPrefix: "_components.SSOSignIn" });

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, isPending } = useAction(signInWithSSO, actionUtils);

  return (
    <FieldSet className="mx-auto w-full max-w-sm p-3">
      <FieldLegend>{t("header")}</FieldLegend>
      <FieldDescription>{t("headerSub")}</FieldDescription>

      <Field>
        <ButtonAction
          hasErrored={hasErrored}
          hasSucceeded={hasSucceeded}
          isPending={isPending}
          onClick={() => execute({ providerId })}
        >
          {t("buttonSignIn", { name: providerName })}
        </ButtonAction>
      </Field>
    </FieldSet>
  );
}
