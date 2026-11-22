import { expect, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorOverview } from "../../../../app/(main)/agent/_components/AgentEditorOverview";

const meta = {
  title: "Web/(main)/agent/AgentEditorOverview",
  component: AgentEditorOverview,
  args: {
    mode: "create",
  },
} satisfies Meta<typeof AgentEditorOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Mode_create: Story = { args: {} };
export const Mode_update: Story = { args: { mode: "update" } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };

export const Mobile: Story = {
  args: { mode: "update" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-[393px] max-w-full">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    for (const [title, view] of [
      ["Rollen", "roles"],
      ["Unterstützung", "docs"],
      ["Einstellungen", "settings"],
    ]) {
      const group = canvas.getByRole("region", { name: title });
      await expect(
        within(group).getByRole("link", { name: title }),
      ).toHaveAttribute("href", "?view=" + view);
    }
  },
};
