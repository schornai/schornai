"use client";

import { useRender } from "@base-ui/react/use-render";
import { mergeProps } from "@base-ui/react/merge-props";
import { cn } from "../lib/utils.ts";
import { CSSProperties } from "react";

// FROM: packages/database/src/_shared/_schema.ts
// Hint: keep package ui independend from database, zod
type AppColorHint =
  | {
      oklchHue: number;
      type: "color-oklch-hue";
    }
  | {
      blue: number;
      green: number;
      opacity?: number;
      red: number;
      type: "color-rgb";
    };

type ColorVariant = "dark" | "default" | "light";

function getOklchHueLightness(variant: ColorVariant) {
  switch (variant) {
    case "dark":
      return "45%";
    case "default":
      return "70%";
    case "light":
      return "80%";
  }
}

function toCSSColor(
  color: AppColorHint | undefined,
  variant: ColorVariant,
): string {
  switch (color?.type) {
    case "color-oklch-hue": {
      const hue = color.oklchHue;
      const chroma = 0.15;
      const lightness = getOklchHueLightness(variant);

      return `oklch(${lightness} ${chroma} ${hue} / .6)`;
    }
    case "color-rgb": {
      if (Number.isFinite(color.opacity)) {
        return `rgb(${color.red} ${color.green} ${color.blue} / ${color.opacity})`;
      }
      return `rgb(${color.red} ${color.green} ${color.blue})`;
    }
  }

  const lightness = getOklchHueLightness(variant);
  return `oklch(${lightness} 0 0 / .6)`;
}

export function ContainerStyled({
  appColor,
  className,
  interactive,
  render,
  variant,
  ...props
}: useRender.ComponentProps<"div"> & {
  appColor?: AppColorHint;
  interactive?: boolean;
  variant?: "card";
}) {
  const element = useRender({
    defaultTagName: "div",
    render,
    props: mergeProps<"div">(
      {
        className: cn(
          "bg-background/60 dark:bg-foreground/10 backdrop-blur-md",
          { "bg-(--color-default) dark:bg-(--color-dark)": appColor },
          {
            "cursor-pointer hover:bg-(--color-light) dark:hover:bg-(--color-default)":
              interactive,
          },
          {
            "rounded-md border p-3 shadow-xs ": variant === "card",
          },
          className,
        ),
        style: {
          "--color-dark": toCSSColor(appColor, "dark"),
          "--color-default": toCSSColor(appColor, "default"),
          "--color-light": toCSSColor(appColor, "light"),
        } as CSSProperties,
      },
      props,
    ),
  });
  return element;
}
