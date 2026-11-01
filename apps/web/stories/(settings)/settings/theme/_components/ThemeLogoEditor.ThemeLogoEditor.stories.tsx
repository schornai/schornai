import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { ThemeLogoEditor } from "../../../../../app/(settings)/settings/theme/_components/ThemeLogoEditor";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeLogoEditor",
  component: ThemeLogoEditor,
  args: { language: "de", onChange: fn(), onRemove: fn() },
  render: function Render(args) {
    const [logo, setLogo] = useState(args.logo);
    return <ThemeLogoEditor {...args} logo={logo} onChange={setLogo} />;
  },
} satisfies Meta<typeof ThemeLogoEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Custom: Story = {
  args: {
    logo: { url: "/api/storage/storybook-avatar.svg", alt: "Firmenlogo" },
  },
};
export const Invalid: Story = { args: { logo: { url: "invalid", alt: "" } } };
