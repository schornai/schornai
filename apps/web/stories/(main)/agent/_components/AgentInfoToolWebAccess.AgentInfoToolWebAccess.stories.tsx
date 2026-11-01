import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoToolWebAccess } from "../../../../app/(main)/agent/_components/AgentInfoToolWebAccess";

const meta = {
  title: "Web/(main)/agent/AgentInfoToolWebAccess",
  component: AgentInfoToolWebAccess,
  args: {},
} satisfies Meta<typeof AgentInfoToolWebAccess>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Opened: Story = { play: openDisclosure };

export const Configured: Story = {
  args: {
    agentRole: {
      toolWebAccess: {
        active: true,
        webFetch: "ask",
        webFetchAccess: "allow-list",
        webFetchAllowList: ["example.com", "*.wikipedia.org"],
        webSearch: "on",
        webSearchProvider: "staan",
      },
    },
    editRoleId: "role",
  },
  play: openDisclosure,
};
