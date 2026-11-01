"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { useId, useState } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Input } from "@schornio/aibox-package-ui/components/input";
import Link from "next/link";
import { signInWithPassword } from "../_actions/signInWithPassword";
import { useAction } from "next-safe-action/hooks";
import { useDecayActionState } from "@schornio/aibox-package-ui/hooks/use-decay-action-state";
import { useSearchParams } from "next/navigation";
import { useT } from "next-i18next/client";

export function PasswordSignIn() {
  const emailInputId = useId();
  const passwordInputId = useId();

  const { t } = useT("signIn", { keyPrefix: "_components.PasswordSignIn" });

  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;

  const { actionUtils, hasErrored, hasSucceeded } = useDecayActionState();
  const { execute, result, isPending } = useAction(
    signInWithPassword,
    actionUtils,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const invalidEmail = Boolean(result.validationErrors?.email);
  const invalidPassword = Boolean(result.validationErrors?.password);

  return (
    <form
      className="contents"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        execute({ email, next, password });
      }}
    >
      <FieldSet className="mx-auto w-full max-w-sm p-3">
        <FieldLegend>{t("header")}</FieldLegend>
        <FieldDescription>{t("headerSub")}</FieldDescription>

        <Field data-invalid={invalidEmail}>
          <FieldLabel htmlFor={emailInputId}>{t("inputEmailLabel")}</FieldLabel>
          <Input
            aria-invalid={invalidEmail}
            autoComplete="email"
            id={emailInputId}
            onChange={(event) => setEmail(event.currentTarget.value)}
            placeholder="hello@schorn.ai"
            type="email"
            value={email}
          />
        </Field>
        <Field data-invalid={invalidPassword}>
          <FieldLabel htmlFor={passwordInputId}>
            {t("inputPasswordLabel")}
          </FieldLabel>
          <Input
            aria-invalid={invalidPassword}
            autoComplete="current-password"
            id={passwordInputId}
            onChange={(event) => setPassword(event.currentTarget.value)}
            type="password"
            value={password}
          />
        </Field>

        <Field>
          <ButtonAction
            hasErrored={hasErrored}
            hasSucceeded={hasSucceeded}
            isPending={isPending}
            type="submit"
          >
            {t("buttonSignIn")}
          </ButtonAction>
          <Button
            nativeButton={false}
            render={<Link href="/signin/reset">{t("buttonReset")}</Link>}
            variant="outline"
          />
        </Field>
      </FieldSet>
    </form>
  );
}
