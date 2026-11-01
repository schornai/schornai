import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Tabs } from "@schornio/aibox-package-ui/components/tabs";
import { ThemeColorsTab } from "../../../../../app/(settings)/settings/theme/_components/ThemeColorsTab";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeColorsTab",
  component: ThemeColorsTab,
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
    },
    setTheme: fn(),
    isBusy: false,
  },
  decorators: [
    (Story) => (
      <Tabs value="colors">
        <Story />
      </Tabs>
    ),
  ],
  render: function Render(args) {
    const [theme, setTheme] = useState(args.theme);
    return <ThemeColorsTab {...args} theme={theme} setTheme={setTheme} />;
  },
} satisfies Meta<typeof ThemeColorsTab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
