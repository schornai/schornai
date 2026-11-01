import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeProvider } from "../../app/_components/ThemeProvider";

const meta = {
  title: "Web/ThemeProvider",
  component: ThemeProvider,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof ThemeProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
