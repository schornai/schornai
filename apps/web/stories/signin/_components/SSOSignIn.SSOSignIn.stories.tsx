import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SSOSignIn } from "../../../app/signin/_components/SSOSignIn";

const meta = {
  title: "Web/signin/SSOSignIn",
  component: SSOSignIn,
  args: {
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof SSOSignIn>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ProviderName_missing: Story = {
  args: { providerName: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
