import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageObjectTileContainer } from "../../app/_components/StorageObjectTileContainer";

const meta = {
  title: "Web/StorageObjectTileContainer",
  component: StorageObjectTileContainer,
  args: { view: "table" },
} satisfies Meta<typeof StorageObjectTileContainer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
