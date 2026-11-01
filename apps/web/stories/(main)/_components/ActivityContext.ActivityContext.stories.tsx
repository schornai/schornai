import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityContext } from "../../../app/(main)/_components/ActivityContext";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/ActivityContext",
  component: ActivityContext,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof ActivityContext>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
