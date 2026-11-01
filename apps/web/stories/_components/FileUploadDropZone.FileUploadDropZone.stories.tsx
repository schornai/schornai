import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileUploadDropZone } from "../../app/_components/FileUploadDropZone";

const meta = {
  title: "Web/FileUploadDropZone",
  component: FileUploadDropZone,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof FileUploadDropZone>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
