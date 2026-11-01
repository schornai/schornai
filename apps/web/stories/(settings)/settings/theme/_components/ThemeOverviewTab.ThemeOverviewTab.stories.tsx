import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { Tabs } from "@schornio/aibox-package-ui/components/tabs";
import { ThemeOverviewTab } from "../../../../../app/(settings)/settings/theme/_components/ThemeOverviewTab";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeOverviewTab",
  component: ThemeOverviewTab,
  args: {
    theme: { version: "theme-v2" },
    savedTheme: { version: "theme-v2" },
    welcomeMessage: {},
    savedWelcomeMessage: {},
    onEdit: fn(),
  },
  decorators: [
    (Story) => (
      <Tabs value="default">
        <Story />
      </Tabs>
    ),
  ],
} satisfies Meta<typeof ThemeOverviewTab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
