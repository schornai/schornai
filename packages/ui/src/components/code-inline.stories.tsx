import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodeInline } from "./code-inline.tsx";

const meta = {
  title: "UI/CodeInline",
  component: CodeInline,
  args: { children: "const answer = 42;" },
} satisfies Meta<typeof CodeInline>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { children: undefined } };
export const Long: Story = {
  args: { children: "long_variable_name_".repeat(20) },
};
