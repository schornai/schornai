import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageBreadcrumbs } from "../../app/_components/StorageBreadcrumbs";

const meta = {
  title: "Web/StorageBreadcrumbs",
  component: StorageBreadcrumbs,
  args: { basePathApp: "/files", path: "/beispiel.txt" },
} satisfies Meta<typeof StorageBreadcrumbs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
