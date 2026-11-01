import { expect } from "storybook/test";
import { openDialog } from "../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextFeedback } from "../../../app/feedback/_components/TextFeedback";

const meta = {
  title: "Web/feedback/TextFeedback",
  component: TextFeedback,
  args: {},
} satisfies Meta<typeof TextFeedback>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const ConfirmationOpened: Story = { play: openDialog };
export const NotStarted: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 0, textFeedback: undefined } },
    },
  },
};
export const Blank: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 0, textFeedback: "" } },
    },
  },
};
export const LongText: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: {
        feedback: { starsClicked: 0, textFeedback: "Feedback ".repeat(100) },
      },
    },
  },
};
export const Write: Story = {
  parameters: NotStarted.parameters,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
    await userEvent.type(await canvas.findByRole("textbox"), "Mein Feedback");
    await expect(canvas.getByRole("textbox")).toHaveValue("Mein Feedback");
  },
};
