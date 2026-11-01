import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { openDialog } from "../../../../../.storybook/interaction-helpers";
import { ThemeEditorDiscardChanges } from "../../../../../app/(settings)/settings/theme/_components/ThemeEditorDiscardChanges";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeEditorDiscardChanges",
  component: ThemeEditorDiscardChanges,
  args: {
    settings: {
      theme: { version: "theme-v2", colors: [] },
      welcomeMessage: {},
      accessMessage: {},
    },
    savedSettings: {
      theme: { version: "theme-v2" },
      welcomeMessage: {},
      accessMessage: {},
    },
    disabled: false,
    onDiscard: fn(),
  },
} satisfies Meta<typeof ThemeEditorDiscardChanges>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const ConfirmationOpened: Story = { play: openDialog };
