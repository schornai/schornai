"use client";
import { useId } from "react";
import { useT } from "next-i18next/client";
import type { ConnectionMetadata } from "@schornio/aibox-package-database/connections/_types";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@schornio/aibox-package-ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
export function AgentConnectionSelect({
  connections,
  kind,
  value,
  onChange,
}: {
  connections: ConnectionMetadata[];
  kind: "oauth" | "search";
  value?: string;
  onChange: (id?: string, connection?: ConnectionMetadata) => void;
}) {
  const { t } = useT("agent", {
    keyPrefix: "_components.AgentConnectionSelect",
  });
  const id = useId();
  const items = connections.filter((c) =>
    kind === "oauth"
      ? c.kind === "oauth"
      : c.kind === "brave" || c.kind === "staan",
  );
  const missing = !!value && !items.some((c) => c.id === value);
  const choices = [
    {
      value: "none",
      label: t(kind === "oauth" ? "labelAutomatic" : "labelNone"),
    },
    ...items.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.kind === "oauth" ? "OAuth" : c.kind === "brave" ? "Brave" : "Staan"})`,
    })),
    ...(missing ? [{ value: value!, label: t("labelMissing") }] : []),
  ];
  return (
    <Field data-invalid={missing}>
      <FieldLabel htmlFor={id}>
        {t(kind === "oauth" ? "labelOAuth" : "labelSearch")}
      </FieldLabel>
      <Select
        items={choices}
        value={value || "none"}
        onValueChange={(selected) => {
          if (selected)
            onChange(
              selected === "none" ? undefined : selected,
              items.find((c) => c.id === selected),
            );
        }}
      >
        <SelectTrigger id={id} aria-invalid={missing}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {choices.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldDescription>
        {t(kind === "oauth" ? "descriptionOAuth" : "descriptionSearch")}
      </FieldDescription>
      {!items.length && (
        <FieldDescription>{t("descriptionEmpty")}</FieldDescription>
      )}
      {missing && <FieldError>{t("errorMissing")}</FieldError>}
    </Field>
  );
}
