import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "./link.tsx";

const meta = {
  title: "UI/Link",
  component: Link,
  args: { children: "Link", href: "/internal" },
} satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const External: Story = { args: { href: "https://example.test/" } };
export const Anchor: Story = { args: { href: "#section" } };
export const NoHref: Story = { args: { href: undefined } };
export const NewTab: Story = {
  args: { href: "https://example.test/", target: "_blank", rel: "noreferrer" },
};
