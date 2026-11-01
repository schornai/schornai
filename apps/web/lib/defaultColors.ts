import type { Theme } from "../app/_models/systemConfigTheme";

export const defaultColors: NonNullable<Theme["colors"]> = [
  {
    color: {
      oklchHue: 30,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-burnt-sienna",
    name: "Burnt Sienna",
  },
  {
    color: {
      oklchHue: 60,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-zest",
    name: "Zest",
  },
  {
    color: {
      oklchHue: 100,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-gold",
    name: "Gold",
  },
  {
    color: {
      oklchHue: 140,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-fern",
    name: "Fern",
  },
  {
    color: {
      oklchHue: 180,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-caribbean-green",
    name: "Caribbean Green",
  },
  {
    color: {
      oklchHue: 230,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-cerulean",
    name: "Cerulean",
  },
  {
    color: {
      oklchHue: 290,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-portage",
    name: "Portage",
  },
  {
    color: {
      oklchHue: 340,
      type: "color-oklch-hue" as const,
    },
    id: "default-color-orchid",
    name: "Orchid",
  },
];
