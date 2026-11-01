import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InfoTitle } from "../../app/_components/InfoTitle";

const meta = {
  title: "Web/InfoTitle",
  component: InfoTitle,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof InfoTitle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
