import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { TranscriberEditorSettingsRetries } from "../../../../../../app/(main)/app/transcribe/[transcriberId]/_components/TranscriberEditorSettingsRetries";

const meta = {
  title:
    "Web/(main)/app/transcribe/[transcriberId]/TranscriberEditorSettingsRetries",
  component: TranscriberEditorSettingsRetries,
} satisfies Meta<typeof TranscriberEditorSettingsRetries>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Fast: Story = {
  parameters: {
    contextFixtures: {
      useTranscriberEditor: { transcriber: { retryLevel: "fast" } },
    },
  },
};
export const Balanced: Story = {
  parameters: {
    contextFixtures: {
      useTranscriberEditor: { transcriber: { retryLevel: "balanced" } },
    },
  },
};
export const Thorough: Story = {
  parameters: {
    contextFixtures: {
      useTranscriberEditor: { transcriber: { retryLevel: "thorough" } },
    },
  },
};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = {
  parameters: {
    contextFixtures: {
      useTranscriberEditor: {
        validationErrors: { retryLevel: { _errors: ["Invalid level"] } },
      },
    },
  },
};
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = await canvas.findByRole("slider");
    slider.focus();
    await userEvent.keyboard("{Home}{ArrowRight}");
    await expect(slider).toHaveValue("1");
    await expect(canvas.getByText(/Bis zu 3 Versuche/)).toBeVisible();
  },
};
