import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
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
