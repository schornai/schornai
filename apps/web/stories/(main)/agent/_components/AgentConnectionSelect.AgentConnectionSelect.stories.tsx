import { connectionFixtures } from "../../../../.storybook/connection-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AgentConnectionSelect } from "../../../../app/(main)/agent/_components/AgentConnectionSelect";
const meta = {
  title: "Web/(main)/agent/AgentConnectionSelect",
  component: AgentConnectionSelect,
  args: {
    connections: connectionFixtures,
    kind: "oauth",
    onChange: fn(),
  },
} satisfies Meta<typeof AgentConnectionSelect>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Search: Story = {
  args: { kind: "search", value: "00000000-0000-4000-8000-000000000002" },
};
export const Missing: Story = { args: { value: "missing" } };
