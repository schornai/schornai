"use client";

import { useId, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useT } from "next-i18next/client";
import { Timer } from "lucide-react";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { ButtonAction } from "@schornio/aibox-package-ui/components/button-action";
import { Input } from "@schornio/aibox-package-ui/components/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@schornio/aibox-package-ui/components/field";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@schornio/aibox-package-ui/components/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@schornio/aibox-package-ui/components/select";
import {
  Alert,
  AlertDescription,
} from "@schornio/aibox-package-ui/components/alert";
import type { ChatExpiration } from "@schornio/aibox-package-database/chat/expirationSchema";
import { setChatExpiration } from "../_actions/setChatExpiration";

export function ChatExpirationSettings({
  agentId,
  activityId,
  expiration,
}: {
  agentId: string;
  activityId: string;
  expiration: ChatExpiration;
}) {
  const { t, i18n } = useT("agent", {
    keyPrefix: "_components.ChatExpirationSettings",
  });
  const id = useId();
  const [open, setOpen] = useState(false);
  const initial = expiration.seconds ?? 86400;
  const initialUnit =
    initial % 86400 === 0 ? 86400 : initial % 3600 === 0 ? 3600 : 60;
  const [amount, setAmount] = useState(String(initial / initialUnit));
  const [unit, setUnit] = useState(String(initialUnit));
  const save = useAction(setChatExpiration, {
    onSuccess: () => setOpen(false),
  });
  const seconds = Number(amount) * Number(unit);
  const valid =
    Number.isInteger(Number(amount)) &&
    Number(amount) >= 1 &&
    seconds <= 31_536_000;
  const deadline = expiration.expiresAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "de", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(expiration.expiresAt)) + " UTC"
    : null;
  return (
    <div className="flex justify-end">
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!save.isPending) {
            save.reset();
            setOpen(next);
          }
        }}
      >
        <DialogTrigger render={<Button variant="ghost" size="sm" />}>
          <Timer />
          {deadline ? t("labelScheduled", { date: deadline }) : t("labelOpen")}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("labelTitle")}</DialogTitle>
            <DialogDescription>{t("descriptionDeletion")}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (valid && !save.isPending)
                save.execute({ agentId, activityId, seconds });
            }}
          >
            <FieldGroup>
              <FieldDescription>
                {deadline
                  ? t("descriptionScheduled", { date: deadline })
                  : t("descriptionDisabled")}
              </FieldDescription>
              <Field data-invalid={!valid}>
                <FieldLabel htmlFor={id}>{t("labelDuration")}</FieldLabel>
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={Math.floor(31_536_000 / Number(unit))}
                  step={1}
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={save.isPending}
                  aria-invalid={!valid}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-unit`}>{t("labelUnit")}</FieldLabel>
                <Select
                  items={[
                    { value: "60", label: t("labelMinutes") },
                    { value: "3600", label: t("labelHours") },
                    { value: "86400", label: t("labelDays") },
                  ]}
                  value={unit}
                  onValueChange={(value) => {
                    if (value) setUnit(value);
                  }}
                  disabled={save.isPending}
                >
                  <SelectTrigger id={`${id}-unit`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="60">{t("labelMinutes")}</SelectItem>
                      <SelectItem value="3600">{t("labelHours")}</SelectItem>
                      <SelectItem value="86400">{t("labelDays")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>{t("descriptionDeadline")}</FieldDescription>
              </Field>
              {save.hasErrored ? (
                <Alert variant="destructive">
                  <AlertDescription>{t("errorSave")}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter>
                {expiration.expiresAt ? (
                  <ButtonAction
                    type="button"
                    variant="outline"
                    disabled={save.isPending}
                    isPending={save.isPending}
                    hasErrored={save.hasErrored}
                    onClick={() =>
                      save.execute({ agentId, activityId, seconds: null })
                    }
                  >
                    {t("labelDisable")}
                  </ButtonAction>
                ) : null}
                <ButtonAction
                  type="submit"
                  disabled={!valid || save.isPending}
                  isPending={save.isPending}
                  hasErrored={save.hasErrored}
                >
                  {t("labelSave")}
                </ButtonAction>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
