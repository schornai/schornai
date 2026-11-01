import { useState } from "react";
import { fn } from "storybook/test";
import { userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeAccessMessageEditor } from "../../../../../app/(settings)/settings/theme/_components/ThemeAccessMessageEditor";
import { defaultAccessMessages } from "@/lib/accessMessage";
const meta = {
  title: "Web/(settings)/settings/theme/ThemeAccessMessageEditor",
  component: ThemeAccessMessageEditor,
  args: { localized: {}, onChange: fn() },
  render: function Render(args) {
    const [localized, onChange] = useState(args.localized);
    return (
      <ThemeAccessMessageEditor
        {...args}
        localized={localized}
        onChange={onChange}
      />
    );
  },
} satisfies Meta<typeof ThemeAccessMessageEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Customized: Story = {
  args: { localized: { de: defaultAccessMessages.de! } },
};
export const Pending: Story = {
  ...Customized,
  args: { disabled: true },
};
export const Error: Story = {
  ...Customized,
  parameters: { scenario: "error" },
};

export const Preview: Story = {
  ...Customized,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Vorschau" }),
    );
  },
};
