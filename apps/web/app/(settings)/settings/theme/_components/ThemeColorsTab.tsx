"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { Plus, RotateCcw } from "lucide-react";
import { useT } from "next-i18next/client";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  Field,
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@schornio/aibox-package-ui/components/field";
import { TabsContent } from "@schornio/aibox-package-ui/components/tabs";
import { defaultColors } from "@/lib/defaultColors";
import type { Theme } from "@/lib/theme";
import { ThemeColorEditor } from "./ThemeColorEditor";

export function ThemeColorsTab({
  theme,
  setTheme,
  isBusy,
}: {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  isBusy: boolean;
}) {
  const { t } = useT("settings", { keyPrefix: "_components.ThemeEditor" });
  const [newestColorId, setNewestColorId] = useState<string>();
  const colors = theme.colors ?? defaultColors;
  const setColors = (colors: Theme["colors"]) =>
    setTheme((current) => ({ ...current, colors }));
  return (
    <TabsContent value="colors">
      <FieldSet disabled={isBusy}>
        <FieldLegend>{t("labelColors")}</FieldLegend>
        <FieldDescription>{t("descriptionColors")}</FieldDescription>
        <DragDropProvider
          onDragEnd={(event) => {
            if (event.canceled || isBusy) return;
            setTheme((current) => {
              const currentColors = current.colors ?? defaultColors;
              const reordered = move(currentColors, event);
              return reordered === currentColors
                ? current
                : { ...current, colors: reordered };
            });
          }}
        >
          <div className="flex flex-col gap-3">
            {colors.map((entry, index) => (
              <ThemeColorEditor
                key={entry.id}
                entry={entry}
                disabled={isBusy}
                index={index}
                defaultOpen={entry.id === newestColorId}
                onChange={(updated) =>
                  setColors(
                    colors.map((color) =>
                      color.id === entry.id ? updated : color,
                    ),
                  )
                }
                onRemove={() =>
                  setColors(colors.filter((color) => color.id !== entry.id))
                }
              />
            ))}
          </div>
        </DragDropProvider>
        {colors.length === 0 && (
          <FieldDescription>{t("descriptionEmptyColors")}</FieldDescription>
        )}
        <Field orientation="horizontal" className="flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy || colors.length >= 64}
            onClick={() => {
              const id = crypto.randomUUID();
              setNewestColorId(id);
              setColors([
                ...colors,
                {
                  id,
                  name: t("labelNewColor"),
                  color: { type: "color-oklch-hue", oklchHue: 230 },
                },
              ]);
            }}
          >
            <Plus data-icon="inline-start" />
            {t("labelAddColor")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isBusy || theme.colors === undefined}
            onClick={() => setColors(undefined)}
          >
            <RotateCcw data-icon="inline-start" />
            {t("labelDefaultColors")}
          </Button>
        </Field>
      </FieldSet>
    </TabsContent>
  );
}
