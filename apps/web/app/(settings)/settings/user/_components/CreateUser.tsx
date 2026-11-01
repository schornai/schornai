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
import { createUser } from "../_actions/createUser";
import { useAction } from "next-safe-action/hooks";
import { useDecayState } from "@schornio/aibox-package-ui/hooks/use-decay-state";
import { useT } from "next-i18next/client";

import { AccessMessageDialog } from "./AccessMessageDialog";
import type { AccessMessageTemplates } from "@/lib/accessMessage";

export function CreateUser({
  templates = {},
}: {
  templates?: AccessMessageTemplates;
}) {
  const id = useId();
  const { t } = useT("settings", { keyPrefix: "_components.CreateUser" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [copyIsPending, setCopyIsPending] = useState(false);
  const [copyFinishState, setCopyFinishState] = useDecayState<
    "success" | "error" | undefined
  >(undefined);
  const { execute, result, isPending } = useAction(createUser);
  const created = result.data;
  const invalidEmail = Boolean(result.validationErrors?.email);

  return (
    <form
      className="mx-auto w-full max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (!created && !isPending) execute({ email, firstName, lastName });
      }}
    >
      <FieldSet disabled={isPending}>
        <FieldLegend>{t("labelTitle")}</FieldLegend>
        <FieldDescription>{t("descriptionKey")}</FieldDescription>
        <FieldGroup>
          <Field data-invalid={invalidEmail}>
            <FieldLabel htmlFor={`${id}-email`}>{t("labelEmail")}</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              required
              value={email}
              readOnly={Boolean(created)}
              aria-invalid={invalidEmail}
              onChange={(event) => setEmail(event.target.value)}
            />
            {invalidEmail && (
              <FieldDescription>{t("errorEmail")}</FieldDescription>
            )}
          </Field>
          {(
            [
              [
                "firstName",
                firstName,
                setFirstName,
                "given-name",
                "labelFirstName",
              ],
              [
                "lastName",
                lastName,
                setLastName,
                "family-name",
                "labelLastName",
              ],
            ] as const
          ).map(([key, value, setValue, autoComplete, label]) => (
            <Field
              key={key}
              data-invalid={Boolean(result.validationErrors?.[key])}
            >
              <FieldLabel htmlFor={`${id}-${key}`}>{t(label)}</FieldLabel>
              <Input
                id={`${id}-${key}`}
                autoComplete={autoComplete}
                maxLength={200}
                value={value}
                readOnly={Boolean(created)}
                aria-invalid={Boolean(result.validationErrors?.[key])}
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
          ))}
          {result.serverError && (
            <Alert variant="destructive">
              <AlertDescription>{t("errorCreate")}</AlertDescription>
            </Alert>
          )}
          {created ? (
            <>
              <Alert>
                <AlertDescription>{t("descriptionSuccess")}</AlertDescription>
              </Alert>
              <Field>
                <FieldLabel htmlFor={`${id}-key`}>{t("labelKey")}</FieldLabel>
                <Input
                  id={`${id}-key`}
                  readOnly
                  value={created.passwordResetKey}
                  onFocus={(event) => event.target.select()}
                />
                <FieldDescription>
                  {t("descriptionExpires", {
                    expires: new Date(created.expires).toLocaleString(),
                  })}
                </FieldDescription>
              </Field>
              <AccessMessageDialog
                email={email.trim()}
                firstName={firstName}
                lastName={lastName}
                resetKey={created.passwordResetKey}
                expires={created.expires}
                templates={templates}
              />
              <Field orientation="horizontal">
                <ButtonAction
                  hasErrored={copyFinishState === "error"}
                  hasSucceeded={copyFinishState === "success"}
                  isPending={copyIsPending}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!navigator.clipboard) {
                      setCopyFinishState("error");
                      return;
                    }
                    setCopyFinishState(undefined);
                    setCopyIsPending(true);
                    navigator.clipboard
                      .writeText(created.passwordResetKey)
                      .then(() => setCopyFinishState("success"))
                      .catch(() => setCopyFinishState("error"))
                      .finally(() => setCopyIsPending(false));
                  }}
                >
                  {t(
                    copyFinishState === "success" ? "labelCopied" : "labelCopy",
                  )}
                </ButtonAction>
                <Button
                  nativeButton={false}
                  role="link"
                  render={<Link href={`/settings/user/${created.userId}`} />}
                >
                  {t("labelOpenUser")}
                </Button>
              </Field>
              {copyFinishState === "error" && (
                <FieldDescription role="alert">
                  {t("errorCopy")}
                </FieldDescription>
              )}
            </>
          ) : (
            <ButtonAction type="submit" isPending={isPending}>
              {t("labelCreate")}
            </ButtonAction>
          )}
          <Button
            nativeButton={false}
            role="link"
            variant="ghost"
            render={<Link href="/settings/user" />}
          >
            {t("labelBack")}
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
