import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContainerMain } from "./container-main.tsx";

const meta = {
  title: "UI/ContainerMain",
  component: ContainerMain,
  args: { children: "Inhalt" },
} satisfies Meta<typeof ContainerMain>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Narrow: Story = { args: { size: "narrow" } };
export const Empty: Story = { args: { children: undefined } };
export const LongContent: Story = {
  args: { children: "Langer Inhalt ".repeat(80) },
};
