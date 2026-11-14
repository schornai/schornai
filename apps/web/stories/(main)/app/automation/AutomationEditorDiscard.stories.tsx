import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationEditorDiscard } from "../../../../app/(main)/app/automation/_components/AutomationEditorDiscard";
import { automation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationEditorDiscard",
  component: AutomationEditorDiscard,
  args: {
    value: { ...automation, name: "Geänderter Bericht" },
    initial: automation,
    onDiscard: () => {},
  },
} satisfies Meta<typeof AutomationEditorDiscard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
