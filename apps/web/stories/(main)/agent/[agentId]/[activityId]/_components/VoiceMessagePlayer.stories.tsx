import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VoiceMessagePlayer } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/VoiceMessagePlayer";

import { voiceMessageFixture } from "../../../../../../.storybook/voice-message-fixture";
import { expect } from "storybook/test";

const meta = {
  title: "Web/Chat/VoiceMessagePlayer",
  component: VoiceMessagePlayer,
  decorators: [
    (Story) => (
      <div className="w-80 max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    duration: voiceMessageFixture.duration,
    peaks: voiceMessageFixture.peaks,
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    src:
      "/api/storage/realtime_files/activity_chat___chat_agent/" +
      voiceMessageFixture.path,
    transcript: "Welche Termine stehen diese Woche an?",
  },
} satisfies Meta<typeof VoiceMessagePlayer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Collapsed: Story = {};
const expand: NonNullable<Story["play"]> = async ({ canvas, userEvent }) => {
  const toggle = canvas.getByRole("button", {
    name: /Transkript ein- oder ausklappen|Expand or collapse transcript/i,
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(toggle);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
};
export const Transcript: Story = {
  play: async (context) => {
    await expand(context);
    await expect(
      context.canvas.getByText(context.args.transcript!),
    ).toBeVisible();
  },
};
export const Transcribing: Story = {
  args: { transcript: undefined, transcribing: true },
  play: async (context) => {
    await expand(context);
    await expect(context.canvas.getByRole("status")).toHaveTextContent(
      /Wird transkribiert|Transcribing/i,
    );
  },
};
