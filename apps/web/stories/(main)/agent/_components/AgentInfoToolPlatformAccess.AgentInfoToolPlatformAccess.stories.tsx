import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoToolPlatformAccess } from "../../../../app/(main)/agent/_components/AgentInfoToolPlatformAccess";

const meta = {
  title: "Web/(main)/agent/AgentInfoToolPlatformAccess",
  component: AgentInfoToolPlatformAccess,
} satisfies Meta<typeof AgentInfoToolPlatformAccess>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Opened: Story = { play: openDisclosure };
export const LegacyAccess: Story = {
  args: { access: { active: true, level: "editor" } },
  play: openDisclosure,
};
