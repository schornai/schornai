import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationEditorAppearance } from "../../../../app/(main)/app/automation/_components/AutomationEditorAppearance";
import { automation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationEditorAppearance",
  component: AutomationEditorAppearance,
  args: { value: automation, initial: automation, onChange: () => {} },
} satisfies Meta<typeof AutomationEditorAppearance>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
