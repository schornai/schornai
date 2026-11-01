import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsMainListContext } from "../../app/_components/TabsMain";

const meta = {
  title: "Web/TabsMainListContext",
  component: TabsMainListContext,
  args: { children: "Beispielinhalt", searchParamView: "Beispiel" },
} satisfies Meta<typeof TabsMainListContext>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SearchParamView_missing: Story = {
  args: { searchParamView: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
