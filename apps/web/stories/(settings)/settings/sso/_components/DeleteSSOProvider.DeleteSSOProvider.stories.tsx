import { openDialog } from "../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DeleteSSOProvider } from "../../../../../app/(settings)/settings/sso/_components/DeleteSSOProvider";

const meta = {
  title: "Web/(settings)/settings/sso/DeleteSSOProvider",
  component: DeleteSSOProvider,
  args: {},
} satisfies Meta<typeof DeleteSSOProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ConfirmationOpened: Story = { play: openDialog };
