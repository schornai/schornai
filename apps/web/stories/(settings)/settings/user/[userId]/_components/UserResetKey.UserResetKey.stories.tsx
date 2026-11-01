import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { UserResetKey } from "../../../../../../app/(settings)/settings/user/[userId]/_components/UserResetKey";
const meta = {
  title: "Web/(settings)/settings/user/UserResetKey",
  component: UserResetKey,
  args: { userId: "example", isLocal: true },
} satisfies Meta<typeof UserResetKey>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Confirmation: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: /Neuen Reset|Issue a new/,
      }),
    );
  },
};
export const Pending: Story = {
  parameters: { scenario: "pending" },
  play: Confirmation.play,
};
export const Error: Story = {
  parameters: { scenario: "error" },
  play: Confirmation.play,
};
export const Issued: Story = {
  parameters: {
    scenario: "success",
    serviceFixtures: {
      actionResult: {
        passwordResetKey: "example-key-for-storybook-only",
        expires: "2026-10-24T12:00:00Z",
      },
    },
  },
};
export const SSO: Story = { args: { isLocal: false } };
