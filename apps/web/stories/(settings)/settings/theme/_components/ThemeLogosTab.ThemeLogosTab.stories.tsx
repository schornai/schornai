import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Tabs } from "@schornio/aibox-package-ui/components/tabs";
import { ThemeLogosTab } from "../../../../../app/(settings)/settings/theme/_components/ThemeLogosTab";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeLogosTab",
  component: ThemeLogosTab,
  args: {
    theme: {
      version: "theme-v2",
      logo: {
        de: { url: "/api/storage/storybook-avatar.svg", alt: "Firmenlogo" },
      },
    },
    setTheme: fn(),
    setUploadingLanguages: fn(),
    isBusy: false,
  },
  decorators: [
    (Story) => (
      <Tabs value="logos">
        <Story />
      </Tabs>
    ),
  ],
  render: function Render(args) {
    const [theme, setTheme] = useState(args.theme);
    return <ThemeLogosTab {...args} theme={theme} setTheme={setTheme} />;
  },
} satisfies Meta<typeof ThemeLogosTab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
