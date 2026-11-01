import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AccessMessageDialog } from "../../../../../app/(settings)/settings/user/_components/AccessMessageDialog";
const meta = {
  title: "Web/(settings)/settings/user/AccessMessageDialog",
  component: AccessMessageDialog,
  args: {
    email: "ada@example.test",
    firstName: "Ada",
    lastName: "Lovelace",
    resetKey: "example-key",
    expires: "2026-10-27T12:00:00Z",
  },
} satisfies Meta<typeof AccessMessageDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Open: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
  },
};
