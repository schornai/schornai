import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeEditor } from "../../../../../app/(settings)/settings/theme/_components/ThemeEditor";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeEditor",
  component: ThemeEditor,
  args: { defaultTheme: { version: "theme-v2" } },
} satisfies Meta<typeof ThemeEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Custom: Story = {
  args: {
    defaultTheme: {
      version: "theme-v2",
      colors: [
        {
          id: "brand",
          name: "Markenfarbe",
          color: { type: "color-oklch-hue", oklchHue: 250 },
        },
        {
          id: "accent",
          name: "Akzent",
          color: {
            type: "color-rgb",
            red: 40,
            green: 150,
            blue: 120,
            opacity: 0.7,
          },
        },
      ],
      logo: {
        de: { url: "/api/storage/storybook-avatar.svg", alt: "Firmenlogo" },
      },
    },
  },
};
export const SharedLanguage: Story = {
  args: {
    defaultTheme: {
      version: "theme-v2",
      logo: {
        en: { url: "/api/storage/storybook-avatar.svg", alt: "Shared logo" },
      },
    },
    defaultWelcomeMessage: {
      en: "# Welcome\n\nThis text is also used for languages without their own variant.",
    },
  },
};
export const Empty: Story = {
  args: { defaultTheme: { version: "theme-v2", colors: [] } },
};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };

export const Texts: Story = {
  parameters: {
    nextjs: {
      navigation: { pathname: "/settings/theme", query: { view: "texts" } },
    },
  },
  args: {
    defaultWelcomeMessage: { de: "# Willkommen" },
    defaultAccessMessage: {
      de: { subject: "Ihr Zugang", body: "Hallo {{firstName}}" },
    },
  },
};
