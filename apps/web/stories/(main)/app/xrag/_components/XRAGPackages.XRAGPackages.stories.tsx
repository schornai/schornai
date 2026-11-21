import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGPackages } from "../../../../../app/(main)/app/xrag/_components/XRAGPackages";
const meta = {
  title: "Web/(main)/app/xrag/XRAGPackages",
  component: XRAGPackages,
  args: {
    packages: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Support",
        xrag_package_items: [
          {
            kind: "agent",
            resource_id: "agent",
            name: "Support Agent",
          },
        ],
      },
    ],
  },
} satisfies Meta<typeof XRAGPackages>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Empty: Story = { args: { packages: [] } };
export const Models: Story = {
  args: {
    packages: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Support",
        xrag_package_items: [
          {
            kind: "agent",
            resource_id: "agent",
            name: "Support Agent",
          },
          {
            kind: "model",
            resource_id: "model",
            name: "Qwen",
          },
        ],
      },
    ],
  },
};
