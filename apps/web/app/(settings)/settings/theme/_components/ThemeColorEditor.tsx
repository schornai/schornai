"use client";

import { useId } from "react";
import { ChevronDown, GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@schornio/aibox-package-ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@schornio/aibox-package-ui/components/collapsible";
import { ContainerStyled } from "@schornio/aibox-package-ui/components/container-styled";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@schornio/aibox-package-ui/components/field";
import { Input } from "@schornio/aibox-package-ui/components/input";
import { Slider } from "@schornio/aibox-package-ui/components/slider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@schornio/aibox-package-ui/components/select";
import type { Theme } from "@/lib/theme";
import { cn } from "@schornio/aibox-package-ui/lib/utils";

type ThemeColor = NonNullable<Theme["colors"]>[number];

export function ThemeColorEditor({
  entry,
  disabled,
  index,
  defaultOpen = false,
  onChange,
  onRemove,
}: {
  entry: ThemeColor;
  disabled: boolean;
  index: number;
  defaultOpen?: boolean;
  onChange: (entry: ThemeColor) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const { ref, handleRef, isDragging } = useSortable({
    id: entry.id,
    index,
    disabled,
  });
  const { t } = useT("settings", { keyPrefix: "_components.ThemeColorEditor" });
  const { color } = entry;
  const nameInvalid = !entry.name.trim();
  const hueInvalid =
    color.type === "color-oklch-hue" &&
    (!Number.isFinite(color.oklchHue) ||
      color.oklchHue < 0 ||
      color.oklchHue > 360);
  const hex =
    color.type === "color-rgb"
      ? `#${[color.red, color.green, color.blue].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`
      : "#808080";

  return (
    <Collapsible
      ref={ref}
      defaultOpen={defaultOpen}
      render={<Card className={cn("gap-0 py-0", isDragging && "shadow-xl")} />}
    >
      <div className="flex items-center gap-2 p-3">
        <Button
          ref={handleRef}
          type="button"
          variant="ghost"
          size="icon"
          className="cursor-grab touch-none active:cursor-grabbing"
          disabled={disabled}
          aria-label={t("labelReorder", { name: entry.name })}
        >
          <GripVertical />
        </Button>
        <CollapsibleTrigger
          disabled={disabled}
          className="group focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 disabled:opacity-50"
        >
          <ContainerStyled
            render={<span />}
            appColor={hueInvalid ? undefined : color}
            className="h-12 w-20 shrink-0 rounded-md"
            role="img"
            aria-label={t("labelPreview", { name: entry.name })}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">
              {entry.name || t("labelUnnamed")}
            </span>
            <span className="text-muted-foreground block text-xs">
              {color.type === "color-rgb"
                ? hex.toUpperCase()
                : t("labelHueType")}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-data-panel-open:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <CardContent className="pb-4">
          <FieldGroup>
            <Field data-invalid={nameInvalid}>
              <FieldLabel htmlFor={`${id}-name`}>{t("labelName")}</FieldLabel>
              <Input
                disabled={disabled}
                id={`${id}-name`}
                value={entry.name}
                maxLength={100}
                required
                aria-invalid={nameInvalid}
                onChange={(event) =>
                  onChange({ ...entry, name: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-type`}>{t("labelType")}</FieldLabel>
              <Select
                value={color.type}
                disabled={disabled}
                onValueChange={(type) => {
                  if (!type || type === color.type) return;
                  onChange({
                    ...entry,
                    color:
                      type === "color-rgb"
                        ? { type: "color-rgb", red: 128, green: 128, blue: 128 }
                        : { type: "color-oklch-hue", oklchHue: 230 },
                  });
                }}
              >
                <SelectTrigger id={`${id}-type`}>
                  <SelectValue>
                    {color.type === "color-oklch-hue"
                      ? t("labelHueType")
                      : t("labelRgbType")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="color-oklch-hue">
                      {t("labelHueType")}
                    </SelectItem>
                    <SelectItem value="color-rgb">
                      {t("labelRgbType")}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {color.type === "color-oklch-hue" ? (
              <Field data-invalid={hueInvalid}>
                <FieldLabel htmlFor={`${id}-hue`}>{t("labelHue")}</FieldLabel>
                <Input
                  disabled={disabled}
                  id={`${id}-hue`}
                  type="number"
                  min={0}
                  max={360}
                  step="any"
                  required
                  aria-invalid={hueInvalid}
                  value={Number.isFinite(color.oklchHue) ? color.oklchHue : ""}
                  onChange={(event) =>
                    onChange({
                      ...entry,
                      color: { ...color, oklchHue: event.target.valueAsNumber },
                    })
                  }
                />
                <Slider
                  aria-label={t("labelHue")}
                  min={0}
                  max={360}
                  value={[hueInvalid ? 0 : color.oklchHue]}
                  disabled={disabled}
                  onValueChange={(value) =>
                    onChange({
                      ...entry,
                      color: {
                        ...color,
                        oklchHue: Array.isArray(value) ? value[0]! : value,
                      },
                    })
                  }
                />
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor={`${id}-rgb`}>{t("labelRgb")}</FieldLabel>
                  <Input
                    disabled={disabled}
                    id={`${id}-rgb`}
                    type="color"
                    value={hex}
                    onChange={(event) => {
                      const value = event.target.value;
                      onChange({
                        ...entry,
                        color: {
                          ...color,
                          red: parseInt(value.slice(1, 3), 16),
                          green: parseInt(value.slice(3, 5), 16),
                          blue: parseInt(value.slice(5, 7), 16),
                        },
                      });
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>
                    {t("labelOpacity", {
                      value: Math.round((color.opacity ?? 1) * 100),
                    })}
                  </FieldLabel>
                  <Slider
                    aria-label={t("labelOpacity", {
                      value: Math.round((color.opacity ?? 1) * 100),
                    })}
                    min={0}
                    max={1}
                    step={0.01}
                    value={[color.opacity ?? 1]}
                    disabled={disabled}
                    onValueChange={(value) =>
                      onChange({
                        ...entry,
                        color: {
                          ...color,
                          opacity: Array.isArray(value) ? value[0]! : value,
                        },
                      })
                    }
                  />
                </Field>
              </>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="pb-4">
          <Button
            type="button"
            variant="destructive"
            disabled={disabled}
            onClick={onRemove}
            aria-label={t("labelRemove", { name: entry.name })}
          >
            <X data-icon="inline-start" />
            {t("labelRemoveButton")}
          </Button>
        </CardFooter>
      </CollapsibleContent>
    </Collapsible>
  );
}
