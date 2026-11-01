import { useState } from "react";
import { fn } from "storybook/test";
import { adaptFixture, type Scenario } from "./scenario";
import { fieldValidationErrors } from "./validation-errors";

export function useContextFixture<T>(
  base: T,
  scenario: Scenario,
  overrides?: unknown,
): T {
  const [value, setValue] = useState(() => {
    let fixture = adaptFixture(base, scenario);
    if (
      scenario === "error" &&
      fixture &&
      typeof fixture === "object" &&
      "hasValidationError" in fixture
    )
      fixture = { ...fixture, validationErrors: fieldValidationErrors };
    if (overrides === undefined) return fixture;
    return fixture &&
      typeof fixture === "object" &&
      !Array.isArray(fixture) &&
      overrides &&
      typeof overrides === "object"
      ? ({ ...fixture, ...overrides } as T)
      : (overrides as T);
  });
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value instanceof Map
  )
    return value;
  const live = { ...value } as Record<string, unknown>;
  // Pair setters with their data field so controls and editors behave interactively.
  for (const key of Object.keys(live)) {
    if (!key.startsWith("set") || typeof live[key] !== "function") continue;
    const field = key.slice(3, 4).toLowerCase() + key.slice(4);
    if (!(field in live)) continue;
    live[key] = fn((next: unknown) =>
      setValue((previous) => {
        const record = previous as Record<string, unknown>;
        return {
          ...record,
          [field]: typeof next === "function" ? next(record[field]) : next,
        } as T;
      }),
    );
  }
  if ("isPlaying" in live) {
    live.play = fn(() =>
      setValue((previous) => ({ ...previous, isPlaying: true })),
    );
    live.pause = fn(() =>
      setValue((previous) => ({ ...previous, isPlaying: false })),
    );
  }
  if ("selectedCurrentMessage" in live) {
    for (const field of ["text", "thinking"]) {
      const key = `setSelectedCurrentMessage${field[0]!.toUpperCase()}${field.slice(1)}`;
      live[key] = fn((next: unknown) =>
        setValue((previous) => {
          const record = previous as Record<string, unknown>;
          const selected = record.selectedCurrentMessage as
            { content: Record<string, unknown> } | undefined;
          return selected
            ? ({
                ...record,
                selectedCurrentMessage: {
                  ...selected,
                  content: { ...selected.content, [field]: next },
                },
              } as T)
            : previous;
        }),
      );
    }
  }
  return live as T;
}
