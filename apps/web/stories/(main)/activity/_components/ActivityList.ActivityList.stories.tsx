import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityList } from "../../../../app/(main)/activity/_components/ActivityList";

const meta = {
  title: "Web/(main)/activity/ActivityList",
  component: ActivityList,
  args: {},
} satisfies Meta<typeof ActivityList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ViewList: Story = {
  parameters: { contextFixtures: { useActivityList: { view: "list" } } },
};
export const ViewTable: Story = {
  parameters: { contextFixtures: { useActivityList: { view: "table" } } },
};
export const DefaultPreferences: Story = {
  parameters: {
    contextFixtures: {
      useActivityList: { isDefaultPreferences: true, isUserPreferences: false },
    },
  },
};
export const SavedPreferences: Story = {
  parameters: {
    contextFixtures: {
      useActivityList: { isDefaultPreferences: false, isUserPreferences: true },
    },
  },
};
