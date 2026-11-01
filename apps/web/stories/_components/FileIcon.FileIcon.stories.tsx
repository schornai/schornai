import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileIcon } from "../../app/_components/FileIcon";

const meta = {
  title: "Web/FileIcon",
  component: FileIcon,
  args: { path: "/beispiel.txt" },
} satisfies Meta<typeof FileIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Path_missing: Story = { args: { path: undefined } };
export const Audio: Story = { args: { path: "example.mp3" } };
export const Video: Story = { args: { path: "example.mp4" } };
export const Code: Story = { args: { path: "example.ts" } };
export const Image: Story = { args: { path: "example.png" } };
export const PlainText: Story = { args: { path: "example.txt" } };
export const Presentation: Story = { args: { path: "example.pptx" } };
export const RichText: Story = { args: { path: "example.docx" } };
export const Spreadsheet: Story = { args: { path: "example.xlsx" } };
export const Unknown: Story = { args: { path: "example.unknown" } };
