import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Tabs } from "@schornio/aibox-package-ui/components/tabs";
import { ThemeTextTab } from "../../../../../app/(settings)/settings/theme/_components/ThemeTextTab";
const meta = {
  title: "Web/(settings)/settings/theme/ThemeTextTab",
  component: ThemeTextTab,
  args: {
    welcomeMessage: { de: "# Willkommen" },
    accessMessage: {},
    onWelcomeMessageChange: fn(),
    onAccessMessageChange: fn(),
    disabled: false,
  },
  decorators: [
    (Story) => (
      <Tabs value="texts">
        <Story />
      </Tabs>
    ),
  ],
  render: function Render(args) {
    const [welcomeMessage, onWelcomeMessageChange] = useState(
      args.welcomeMessage,
    );
    const [accessMessage, onAccessMessageChange] = useState(args.accessMessage);
    return (
      <ThemeTextTab
        {...args}
        welcomeMessage={welcomeMessage}
        onWelcomeMessageChange={onWelcomeMessageChange}
        accessMessage={accessMessage}
        onAccessMessageChange={onAccessMessageChange}
      />
    );
  },
} satisfies Meta<typeof ThemeTextTab>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
