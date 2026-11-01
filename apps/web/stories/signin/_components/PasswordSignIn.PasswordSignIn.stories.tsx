import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PasswordSignIn } from "../../../app/signin/_components/PasswordSignIn";

const meta = {
  title: "Web/signin/PasswordSignIn",
  component: PasswordSignIn,
  args: {},
} satisfies Meta<typeof PasswordSignIn>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
