import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SignOutButton } from "../../app/_components/SignOutButton";

const meta = {
  title: "Web/SignOutButton",
  component: SignOutButton,
  args: {
    hasErrored: false,
    hasSucceeded: false,
    indicator: "replace",
    isPending: false,
    children: "Beispielinhalt",
    disabled: false,
    size: "default",
    variant: "default",
  },
} satisfies Meta<typeof SignOutButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const HasErrored_false: Story = { args: {} };
export const HasErrored_true: Story = { args: { hasErrored: true } };
export const HasSucceeded_false: Story = { args: {} };
export const HasSucceeded_true: Story = { args: { hasSucceeded: true } };
export const Indicator_replace: Story = { args: {} };
export const Indicator_after: Story = { args: { indicator: "after" } };
export const IsPending_false: Story = { args: {} };
export const IsPending_true: Story = { args: { isPending: true } };
export const Disabled_false: Story = { args: {} };
export const Disabled_true: Story = { args: { disabled: true } };
export const Size_default: Story = { args: {} };
export const Size_icon: Story = { args: { size: "icon" } };
export const Size_xs: Story = { args: { size: "xs" } };
export const Size_sm: Story = { args: { size: "sm" } };
export const Size_lg: Story = { args: { size: "lg" } };
export const Size_icon_xs: Story = { args: { size: "icon-xs" } };
export const Size_icon_sm: Story = { args: { size: "icon-sm" } };
export const Size_icon_lg: Story = { args: { size: "icon-lg" } };
export const Variant_default: Story = { args: {} };
export const Variant_link: Story = { args: { variant: "link" } };
export const Variant_outline: Story = { args: { variant: "outline" } };
export const Variant_secondary: Story = { args: { variant: "secondary" } };
export const Variant_ghost: Story = { args: { variant: "ghost" } };
export const Variant_destructive: Story = { args: { variant: "destructive" } };
export const HasErrored_missing: Story = { args: { hasErrored: undefined } };
export const HasSucceeded_missing: Story = {
  args: { hasSucceeded: undefined },
};
export const Indicator_missing: Story = { args: { indicator: undefined } };
export const IsPending_missing: Story = { args: { isPending: undefined } };
export const Disabled_missing: Story = { args: { disabled: undefined } };
export const Size_missing: Story = { args: { size: undefined } };
export const Variant_missing: Story = { args: { variant: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
