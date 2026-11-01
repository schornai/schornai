import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ResetPassword } from "../../../app/signin/_components/ResetPassword";

const meta = {
  title: "Web/signin/ResetPassword",
  component: ResetPassword,
} satisfies Meta<typeof ResetPassword>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
