import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageView } from "../../app/_components/StorageView";

const meta = {
  title: "Web/StorageView",
  component: StorageView,
  args: {},
} satisfies Meta<typeof StorageView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ViewTable: Story = {
  parameters: { contextFixtures: { useStorageView: { view: "table" } } },
};
export const ViewColumns: Story = {
  parameters: { contextFixtures: { useStorageView: { view: "columns" } } },
};
export const ViewTilesSmall: Story = {
  parameters: { contextFixtures: { useStorageView: { view: "tiles-small" } } },
};
export const ViewTilesMedium: Story = {
  parameters: { contextFixtures: { useStorageView: { view: "tiles-medium" } } },
};
export const ViewTilesLarge: Story = {
  parameters: { contextFixtures: { useStorageView: { view: "tiles-large" } } },
};
export const DefaultPreferences: Story = {
  parameters: {
    contextFixtures: {
      useStorageView: { isDefaultPreferences: true, isUserPreferences: false },
    },
  },
};
export const SavedPreferences: Story = {
  parameters: {
    contextFixtures: {
      useStorageView: { isDefaultPreferences: false, isUserPreferences: true },
    },
  },
};
