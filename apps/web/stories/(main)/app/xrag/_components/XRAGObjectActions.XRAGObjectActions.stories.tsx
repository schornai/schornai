import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGObjectActions } from "../../../../../app/_components/xrag/XRAGObjectActions";
const meta = {
  title: "Web/(main)/app/xrag/XRAGObjectActions",
  component: XRAGObjectActions,
  args: { kind: "agent", id: "example-agent" },
} satisfies Meta<typeof XRAGObjectActions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Automation: Story = {
  args: { kind: "automation", id: "11111111-1111-4111-8111-111111111111" },
};
