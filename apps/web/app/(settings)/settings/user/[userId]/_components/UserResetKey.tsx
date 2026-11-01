"use client";

import { useId, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Input } from "@schornio/aibox-package-ui/components/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { reissueResetKey } from "../../_actions/reissueResetKey";

export function UserResetKey({
  userId,
  isLocal,
}: {
  userId: string;
  isLocal: boolean;
}) {
  const { t } = useT("settings", { keyPrefix: "_components.UserResetKey" });
  const id = useId();
  const { execute, result, isPending, reset } = useAction(reissueResetKey);
  const [confirming, setConfirming] = useState(false);
  const [copyState, setCopyState] = useState<"success" | "error">();
  const issued = result.data;
  return (
    <FieldSet className="mx-auto w-full max-w-xl">
      <FieldLegend>{t("labelTitle")}</FieldLegend>
      <FieldDescription>
        {t(isLocal ? "descriptionLocal" : "descriptionSSO")}
      </FieldDescription>
      {isLocal && (
        <FieldGroup>
          {result.serverError && (
            <FieldDescription role="alert">{t("errorIssue")}</FieldDescription>
          )}
          {issued ? (
            <>
              <Field>
                <FieldLabel htmlFor={id}>{t("labelKey")}</FieldLabel>
                <Input
                  id={id}
                  readOnly
                  value={issued.passwordResetKey}
                  onFocus={(event) => event.target.select()}
                />
                <FieldDescription>
                  {t("descriptionExpires", {
                    expires: new Date(issued.expires).toLocaleString(),
                  })}
                </FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        issued.passwordResetKey,
                      );
                      setCopyState("success");
                    } catch {
                      setCopyState("error");
                    }
                  }}
                >
                  {t(copyState === "success" ? "labelCopied" : "labelCopy")}
                </Button>
                <Button
                  onClick={() => {
                    reset();
                    setConfirming(false);
                    setCopyState(undefined);
                  }}
                >
                  {t("labelClose")}
                </Button>
              </Field>
              {copyState === "error" && (
                <FieldDescription role="alert">
                  {t("errorCopy")}
                </FieldDescription>
              )}
            </>
          ) : confirming ? (
            <>
              <FieldDescription>{t("descriptionConfirm")}</FieldDescription>
              <Field orientation="horizontal">
                <ButtonAction
                  isPending={isPending}
                  onClick={() => {
                    if (!isPending) execute({ userId });
                  }}
                >
                  {t("labelConfirm")}
                </ButtonAction>
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    reset();
                    setConfirming(false);
                  }}
                >
                  {t("labelCancel")}
                </Button>
              </Field>
            </>
          ) : (
            <Button onClick={() => setConfirming(true)}>
              {t("labelIssue")}
            </Button>
          )}
        </FieldGroup>
      )}
    </FieldSet>
  );
}
