"use client";

import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { useId, useState } from "react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Input } from "@schornio/aibox-package-ui/components/input";
import Link from "next/link";
import { resetPassword } from "../_actions/resetPassword";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";

export function ResetPassword() {
  const id = useId();
  const { t } = useT("signIn", { keyPrefix: "_components.ResetPassword" });
  const [values, setValues] = useState({
    email: "",
    password: "",
    passwordAgain: "",
    passwordResetKey: "",
  });
  const { execute, result, isPending } = useAction(resetPassword);
  const fields = [
    {
      autoComplete: "email",
      error: "errorEmail",
      label: "labelEmail",
      name: "email",
      type: "email",
    },
    {
      autoComplete: "off",
      error: "errorKey",
      label: "labelKey",
      name: "passwordResetKey",
      type: "password",
    },
    {
      autoComplete: "new-password",
      error: "errorPassword",
      label: "labelPassword",
      name: "password",
      type: "password",
    },
    {
      autoComplete: "new-password",
      error: "errorPasswordAgain",
      label: "labelPasswordAgain",
      name: "passwordAgain",
      type: "password",
    },
  ] as const;
  return (
    <form
      className="mx-auto w-full max-w-sm p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isPending && !result.data?.success) execute(values);
      }}
    >
      <FieldSet disabled={isPending}>
        <FieldLegend>{t("labelTitle")}</FieldLegend>
        <FieldDescription>{t("descriptionKey")}</FieldDescription>
        <FieldGroup>
          {result.data?.success ? (
            <Alert>
              <AlertDescription>{t("descriptionSuccess")}</AlertDescription>
            </Alert>
          ) : (
            <>
              {fields.map((field) => {
                const invalid = Boolean(result.validationErrors?.[field.name]);
                return (
                  <Field key={field.name} data-invalid={invalid}>
                    <FieldLabel htmlFor={`${id}-${field.name}`}>
                      {t(field.label)}
                    </FieldLabel>
                    <Input
                      id={`${id}-${field.name}`}
                      type={field.type}
                      autoComplete={field.autoComplete}
                      required
                      aria-invalid={invalid}
                      value={values[field.name]}
                      onChange={(event) =>
                        setValues({
                          ...values,
                          [field.name]: event.target.value,
                        })
                      }
                    />
                    {invalid && (
                      <FieldDescription>{t(field.error)}</FieldDescription>
                    )}
                  </Field>
                );
              })}
              <FieldDescription>{t("descriptionPassword")}</FieldDescription>
              {result.serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{t("errorReset")}</AlertDescription>
                </Alert>
              )}
              <ButtonAction type="submit" isPending={isPending}>
                {t("labelReset")}
              </ButtonAction>
            </>
          )}
          <Button
            nativeButton={false}
            role="link"
            variant="outline"
            render={<Link href="/signin?method=password" />}
          >
            {t("labelSignIn")}
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
