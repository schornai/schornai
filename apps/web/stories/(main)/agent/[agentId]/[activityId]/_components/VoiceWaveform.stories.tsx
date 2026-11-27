import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VoiceWaveform } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/VoiceWaveform";

const meta = {
  title: "Web/Chat/VoiceWaveform",
  component: VoiceWaveform,
  args: {
    agentColor: { type: "color-rgb", red: 38, green: 162, blue: 137 },
    samples: [0.12, 0.4, 0.76, 0.8, 0.32, 0.28, 0.51, 0.63, 0.14, 0.1],
  },
  decorators: [
    (Story) => (
      <div className="w-64 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VoiceWaveform>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
