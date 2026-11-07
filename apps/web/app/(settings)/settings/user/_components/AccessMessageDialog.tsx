"use client";

import { useId, useState } from "react";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@schornio/aibox-package-ui/components/dialog";
import {
  Field,
  FieldLabel,
  FieldGroup,
  FieldError,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Textarea } from "@schornio/aibox-package-ui/components/textarea";
import {
  accessMessageMailto,
  composeAccessMessage,
  type AccessMessageTemplates,
} from "@/lib/accessMessage";

export function AccessMessageDialog({
  email,
  firstName = "",
  lastName = "",
  resetKey,
  expires,
  templates = {},
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  resetKey: string;
  expires: string;
  templates?: AccessMessageTemplates;
}) {
  const { t, i18n } = useT("settings", {
    keyPrefix: "_components.AccessMessageDialog",
  });
  const id = useId();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copyState, setCopyState] = useState<"success" | "error">();
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          const language = i18n?.language ?? "en";
          const message = composeAccessMessage({
            templates,
            language,
            email,
            firstName,
            lastName,
            resetKey,
            expires,
            applicationUrl: window.location.origin,
          });
          setSubject(message.subject);
          setBody(message.body);
          setCopyState(undefined);
          setOpen(true);
        }}
      >
        {t("labelCreateMessage")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>{t("labelTitle")}</DialogTitle>
            <DialogDescription>{t("descriptionText")}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${id}-subject`}>
                {t("labelSubject")}
              </FieldLabel>
              <Input
                id={`${id}-subject`}
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  setCopyState(undefined);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-body`}>{t("labelBody")}</FieldLabel>
              <Textarea
                id={`${id}-body`}
                rows={14}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setCopyState(undefined);
                }}
              />
            </Field>
            {copyState === "error" && (
              <FieldError role="alert">{t("errorCopy")}</FieldError>
            )}
          </FieldGroup>
          <DialogFooter className="flex-col flex-wrap">
            <Button
              nativeButton={false}
              role="link"
              render={<a href={accessMessageMailto(email, subject, body)} />}
            >
              {t("labelEmail")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(body);
                  setCopyState("success");
                } catch {
                  setCopyState("error");
                }
              }}
            >
              {t(copyState === "success" ? "labelCopied" : "labelCopy")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("labelClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
