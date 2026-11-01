import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { StorageDialogRemove } from "../../app/_components/StorageDialogRemove";

const meta = {
  title: "Web/StorageDialogRemove",
  component: StorageDialogRemove,
  args: {
    open: false,
    onOpenChange: fn(),
    path: "/beispiel.txt",
    type: "file",
  },
} satisfies Meta<typeof StorageDialogRemove>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open_false: Story = { args: {} };
export const Open_true: Story = { args: { open: true } };
export const Type_file: Story = { args: {} };
export const Type_folder: Story = { args: { type: "folder" } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
