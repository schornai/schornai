import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeaderAgent } from "../../../../../app/(main)/agent/[agentId]/_components/HeaderAgent";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/agent/[agentId]/HeaderAgent",
  component: HeaderAgent,
  args: { agentId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof HeaderAgent>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
