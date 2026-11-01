"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@schornio/aibox-package-ui/components/dialog";
import { Field, FieldLabel } from "@schornio/aibox-package-ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import { getThemeLanguageName } from "@/lib/themeLanguages";

export function ThemeLanguageAdd({
  languages,
  disabled,
  onAdd,
}: {
  languages: string[];
  disabled?: boolean;
  onAdd: (language: string) => void;
}) {
  const id = useId();
  const { t, i18n } = useT("settings", {
    keyPrefix: "_components.ThemeLanguageAdd",
  });
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<string | null>(null);
  const supported = i18n.options?.supportedLngs;
  const available = Array.isArray(supported)
    ? supported
    : i18n.options?.resources
      ? Object.keys(i18n.options.resources)
      : i18n.languages;
  const items = available
    .filter((value) => value !== "cimode" && !languages.includes(value))
    .map((value) => ({
      value,
      label: getThemeLanguageName(value, i18n.language),
    }));

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) setLanguage(items[0]?.value ?? null);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled || items.length === 0}
          />
        }
      >
        <Plus data-icon="inline-start" /> {t("labelAdd")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("labelTitle")}</DialogTitle>
          <DialogDescription>{t("descriptionLanguage")}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={id}>{t("labelLanguage")}</FieldLabel>
          <Select
            items={items}
            value={language}
            onValueChange={setLanguage}
            disabled={disabled}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {t("labelCancel")}
          </DialogClose>
          <Button
            type="button"
            disabled={
              disabled || !items.some((item) => item.value === language)
            }
            onClick={() => {
              if (!language || !items.some((item) => item.value === language))
                return;
              onAdd(language);
              setOpen(false);
            }}
          >
            {t("labelCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
