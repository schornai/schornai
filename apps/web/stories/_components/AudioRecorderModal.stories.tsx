import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import {
  AudioRecorderProvider,
  AudioRecorderButton,
} from "../../app/_components/AudioRecorderModal";

const meta = {
  title: "Web/AudioRecorderModal",
  component: AudioRecorderProvider,
  args: {
    children: null,
    config: { appColor: { type: "color-oklch-hue", oklchHue: 284 } },
  },
  render: (args) => (
    <AudioRecorderProvider {...args}>
      <AudioRecorderButton />
    </AudioRecorderProvider>
  ),
} satisfies Meta<typeof AudioRecorderProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { config: undefined } };
export const IconButton: Story = {
  render: (args) => (
    <AudioRecorderProvider {...args}>
      <AudioRecorderButton iconOnly />
    </AudioRecorderProvider>
  ),
};
export const Open: Story = {
  play: async ({ canvasElement, userEvent }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: /audio aufnehmen|record audio/i,
      }),
    );
    await expect(within(document.body).getByRole("dialog")).toBeVisible();
  },
};
export const Close: Story = {
  play: async (context) => {
    await Open.play!(context);
    await context.userEvent.click(
      within(document.body).getByRole("button", { name: /schließen|close/i }),
    );
    await expect(
      within(document.body).queryByRole("dialog"),
    ).not.toBeInTheDocument();
  },
};
