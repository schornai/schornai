import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { ThemeColorEditor } from "../../../../../app/(settings)/settings/theme/_components/ThemeColorEditor";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeColorEditor",
  component: ThemeColorEditor,
  args: {
    entry: {
      id: "brand",
      name: "Markenfarbe",
      color: { type: "color-oklch-hue", oklchHue: 230 },
    },
    disabled: false,
    index: 0,
    onChange: fn(),
    onRemove: fn(),
  },
  render: function Render(args) {
    const [entry, setEntry] = useState(args.entry);
    return (
      <DragDropProvider>
        <ThemeColorEditor {...args} entry={entry} onChange={setEntry} />
      </DragDropProvider>
    );
  },
} satisfies Meta<typeof ThemeColorEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Expanded: Story = { args: { defaultOpen: true } };
export const RGB: Story = {
  args: {
    entry: {
      id: "rgb",
      name: "Akzent",
      color: {
        type: "color-rgb",
        red: 40,
        green: 150,
        blue: 120,
        opacity: 0.7,
      },
    },
  },
};
export const Pending: Story = { args: { disabled: true } };
