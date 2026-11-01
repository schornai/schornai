import { openMenu } from "../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentRepositoryListOptionsDropdown } from "../../../../../app/(main)/app/documents/_components/DocumentRepositoryListOptionsDropdown";

const meta = {
  title: "Web/(main)/app/documents/DocumentRepositoryListOptionsDropdown",
  component: DocumentRepositoryListOptionsDropdown,
  args: {},
} satisfies Meta<typeof DocumentRepositoryListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const MenuOpened: Story = { play: openMenu };
