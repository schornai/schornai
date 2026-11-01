import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivityContextProvider } from "../../../app/(main)/_components/ActivityContextProvider";

const meta = {
  title: "Web/(main)/ActivityContextProvider",
  component: ActivityContextProvider,
  args: { children: "Beispielinhalt", typeInfos: new Map() },
} satisfies Meta<typeof ActivityContextProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
