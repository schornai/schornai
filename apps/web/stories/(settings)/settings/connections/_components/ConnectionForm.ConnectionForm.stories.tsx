import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectionForm } from "../../../../../app/(settings)/settings/connections/_components/ConnectionForm";
const meta = {
  title: "Web/(settings)/settings/connections/ConnectionForm",
  component: ConnectionForm,
  args: { kind: "oauth" },
} satisfies Meta<typeof ConnectionForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Brave: Story = { args: { kind: "brave" } };
export const Staan: Story = { args: { kind: "staan" } };
export const Edit: Story = {
  args: {
    kind: "oauth",
    connection: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "GitHub",
      kind: "oauth",
      client_id: "example-client",
      market: null,
    },
  },
};
