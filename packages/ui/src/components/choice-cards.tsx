"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ElementType } from "react";
import { Check } from "lucide-react";
import { Button } from "./button.tsx";
import { ContainerStyled } from "./container-styled.tsx";
import { cn } from "../lib/utils.ts";

/** Single-choice tiles with the same keyboard and pressed-state behavior as
 * other Base UI controls. An active selection cannot be accidentally cleared. */
export function ChoiceCards({
  label,
  value,
  onValueChange,
  options,
  disabled,
  className,
  variant = "cards",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: {
    value: string;
    label: string;
    description?: string;
    icon: ElementType;
  }[];
  disabled?: boolean;
  className?: string;
  variant?: "cards" | "segments";
}) {
  return (
    <ToggleGroup
      aria-label={label}
      value={value ? [value] : []}
      onValueChange={(next) => {
        if (next[0]) onValueChange(String(next[0]));
      }}
      disabled={disabled}
      className={cn(
        variant === "cards"
          ? "grid grid-cols-2 gap-3"
          : "bg-muted flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1",
        className,
      )}
    >
      {options.map(
        ({ value: option, label: title, description, icon: Icon }) => (
          <Toggle
            key={option}
            value={option}
            render={
              variant === "segments" ? (
                <Button variant="ghost" size="sm" />
              ) : (
                <ContainerStyled
                  variant="card"
                  render={<button type="button" />}
                />
              )
            }
            className={
              variant === "segments"
                ? "aria-pressed:bg-background aria-pressed:text-foreground text-muted-foreground aria-pressed:shadow-sm"
                : "group/choice hover:border-primary/40 aria-pressed:border-primary aria-pressed:bg-primary/5 focus-visible:outline-ring flex min-h-24 flex-col items-start gap-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            }
          >
            {variant === "cards" && (
              <span className="flex w-full items-center justify-between gap-2">
                <Icon className="size-5" />
                <Check className="size-4 opacity-0 group-aria-pressed/choice:opacity-100" />
              </span>
            )}
            <span className="text-sm font-medium">{title}</span>
            {variant === "cards" && description && (
              <span className="text-muted-foreground text-xs leading-relaxed">
                {description}
              </span>
            )}
          </Toggle>
        ),
      )}
    </ToggleGroup>
  );
}
