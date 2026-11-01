import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InfoActions } from "../../app/_components/InfoActions";

const meta = {
  title: "Web/InfoActions",
  component: InfoActions,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof InfoActions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
