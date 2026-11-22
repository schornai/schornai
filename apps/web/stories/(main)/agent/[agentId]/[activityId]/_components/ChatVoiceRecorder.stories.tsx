import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { ChatVoiceRecorder } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatVoiceRecorder";
import { mockRecordingMedia } from "../../../../../../.storybook/recording-media-fixture";

const meta = {
  title: "Web/Chat/ChatVoiceRecorder",
  component: ChatVoiceRecorder,
  parameters: { serviceFixtures: { actionResult: { queued: true } } },
  beforeEach: ({ parameters }) =>
    mockRecordingMedia({ waitForMicrophone: parameters.waitForMicrophone }),
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    agentId: "agent",
    activityId: "11111111-1111-4111-8111-111111111111",
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatVoiceRecorder>;
export default meta;
export const Ready: StoryObj<typeof meta> = {
  play: async ({ canvas }) => {
    await canvas.findByText(/^Aufnahme läuft$|^Recording$/i);
    await expect(
      canvas.getByRole("button", {
        name: /Sprachnachricht senden|Send voice message/i,
      }),
    ).toBeEnabled();
  },
};
export const WaitingForMicrophone: StoryObj<typeof meta> = {
  parameters: { waitForMicrophone: true },
  play: async ({ canvas }) => {
    const button = await canvas.findByRole("button", {
      name: /Sprachnachricht senden|Send voice message/i,
    });
    await expect(button).toBeDisabled();
    await expect(button.querySelectorAll("svg")).toHaveLength(1);
    await expect(button.querySelector("svg")).toHaveClass("animate-spin");
  },
};
