import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, spyOn } from "storybook/test";
import { ChatVoiceRecorder } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatVoiceRecorder";
const meta = {
  title: "Web/Chat/ChatVoiceRecorder",
  component: ChatVoiceRecorder,
  parameters: { serviceFixtures: { actionResult: { queued: true } } },
  args: {
    agentId: "agent",
    activityId: "11111111-1111-4111-8111-111111111111",
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-muted w-full max-w-xl rounded-lg border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChatVoiceRecorder>;
export default meta;
export const Ready: StoryObj<typeof meta> = {};

export const WaitingForMicrophone: StoryObj<typeof meta> = {
  beforeEach: () => {
    const request = spyOn(
      navigator.mediaDevices,
      "getUserMedia",
    ).mockImplementation(() => new Promise<MediaStream>(() => {}));
    return () => request.mockRestore();
  },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", {
      name: /Aufnahme starten|Start recording/i,
    });
    await userEvent.click(button);
    await expect(button).toBeDisabled();
    await expect(button.querySelectorAll("svg")).toHaveLength(1);
    await expect(button.querySelector("svg")).toHaveClass("animate-spin");
  },
};
