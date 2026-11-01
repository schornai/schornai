import { expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StarRatingCard } from "../../../app/feedback/_components/StarRatingCard";

const meta = {
  title: "Web/feedback/StarRatingCard",
  component: StarRatingCard,
  args: {},
} satisfies Meta<typeof StarRatingCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const Rating0: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 0, starsHovered: undefined } },
    },
  },
};
export const Rating1: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 1, starsHovered: undefined } },
    },
  },
};
export const Rating2: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 2, starsHovered: undefined } },
    },
  },
};
export const Rating3: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 3, starsHovered: undefined } },
    },
  },
};
export const Rating4: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 4, starsHovered: undefined } },
    },
  },
};
export const Rating5: Story = {
  parameters: {
    contextFixtures: {
      useFeedback: { feedback: { starsClicked: 5, starsHovered: undefined } },
    },
  },
};
export const Hover: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getAllByRole("button")[3]!);
  },
};
export const SelectRating: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button")[4]!);
    await expect(canvas.getAllByRole("button")[4]).toHaveClass("scale-100");
  },
};
export const DeselectRating: Story = {
  parameters: {
    contextFixtures: { useFeedback: { feedback: { starsClicked: 5 } } },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button")[4]!);
    await expect(canvas.getAllByRole("button")[4]).toHaveClass("scale-75");
  },
};
