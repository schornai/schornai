import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ThemeOverview } from "../../../../../app/(settings)/settings/theme/_components/ThemeOverview";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeOverview",
  component: ThemeOverview,
  args: {
    theme: { version: "theme-v2" },
    savedTheme: { version: "theme-v2" },
    welcomeMessage: {},
    savedWelcomeMessage: {},
    onEdit: fn(),
  },
} satisfies Meta<typeof ThemeOverview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Changed: Story = {
  args: {
    theme: {
      version: "theme-v2",
      colors: [
        {
          id: "brand",
          name: "Markenfarbe",
          color: { type: "color-oklch-hue", oklchHue: 250 },
        },
      ],
      logo: {
        de: { url: "/api/storage/storybook-avatar.svg", alt: "Firmenlogo" },
      },
    },
    welcomeMessage: { de: "# Willkommen\n\nWie können wir helfen?" },
  },
};
export const Empty: Story = {
  args: {
    theme: { version: "theme-v2", colors: [] },
    savedTheme: { version: "theme-v2", colors: [] },
  },
};
