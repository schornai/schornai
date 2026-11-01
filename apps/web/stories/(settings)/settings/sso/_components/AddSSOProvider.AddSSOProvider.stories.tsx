import { openDialog } from "../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AddSSOProvider } from "../../../../../app/(settings)/settings/sso/_components/AddSSOProvider";

const meta = {
  title: "Web/(settings)/settings/sso/AddSSOProvider",
  component: AddSSOProvider,
  args: {},
} satisfies Meta<typeof AddSSOProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const DialogOpened: Story = { play: openDialog };
