import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import InputQuery from "../../../../../../../app/(main)/app/documents/[documentRepositoryId]/search/_components/InputQuery";

const meta = {
  title: "Web/(main)/app/documents/[documentRepositoryId]/search/InputQuery",
  component: InputQuery,
  args: {},
} satisfies Meta<typeof InputQuery>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
