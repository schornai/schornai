"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

export function SelectableResourceCard({
  children,
  name,
  selected,
  disabled,
  onSelect,
}: {
  children: ReactNode;
  name: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { t } = useT("common", { keyPrefix: "_components.ResourceSlot" });
  return (
    <div
      className={cn(
        "flex w-full max-w-80 flex-col gap-2 rounded-xl p-2 [&>div]:w-full",
        selected && "bg-muted",
      )}
    >
      {children}
      <Button
        type="button"
        variant={selected ? "secondary" : "outline"}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={t("labelSelectNamed", { name })}
        onClick={onSelect}
      >
        <Check /> {t(selected ? "labelSelected" : "labelSelect")}
      </Button>
    </div>
  );
}
