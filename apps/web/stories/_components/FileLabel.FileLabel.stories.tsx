import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileLabel } from "../../app/_components/FileLabel";

const meta = {
  title: "Web/FileLabel",
  component: FileLabel,
  args: { path: "/beispiel.txt" },
} satisfies Meta<typeof FileLabel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
