import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityListProvider } from "../../../../app/(main)/activity/_components/ActivityListProvider";

const meta = {
  title: "Web/(main)/activity/ActivityListProvider",
  component: ActivityListProvider,
  args: {
    children: "Beispielinhalt",
    id: "11111111-1111-4111-8111-111111111111",
    userPreferences: { group: "no-group", sort: "name:asc", view: "table" },
  },
} satisfies Meta<typeof ActivityListProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
