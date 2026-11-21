import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VoiceMessagePlayer } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/VoiceMessagePlayer";

const meta = {
  title: "Web/Chat/VoiceMessagePlayer",
  component: VoiceMessagePlayer,
  decorators: [
    (Story) => (
      <div className="bg-muted w-80 max-w-full rounded-xl p-3">
        <Story />
      </div>
    ),
  ],
  args: {
    duration: 14,
    peaks: [
      0.12, 0.36, 0.72, 0.56, 0.18, 0.24, 0.88, 0.67, 0.31, 0.22, 0.64, 0.79,
      0.52, 0.34, 0.12,
    ],
    src: "sample.webm",
    transcript: "Welche Termine stehen diese Woche an?",
  },
} satisfies Meta<typeof VoiceMessagePlayer>;
export default meta;
export const Transcript: StoryObj<typeof meta> = {};
