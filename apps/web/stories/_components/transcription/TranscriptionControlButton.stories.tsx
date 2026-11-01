import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RotateCcw } from "lucide-react";
import { TranscriptionControlButton } from "../../../app/_components/transcription/TranscriptionControlButton";
const meta = {
  title: "Web/transcription/TranscriptionControlButton",
  component: TranscriptionControlButton,
  args: {
    "aria-label": "10 Sekunden zurück",
    size: "icon",
    variant: "ghost",
    children: <RotateCcw />,
  },
} satisfies Meta<typeof TranscriptionControlButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
