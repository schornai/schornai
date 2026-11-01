import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContainerStyled } from "./container-styled.tsx";

const meta = {
  title: "UI/ContainerStyled",
  component: ContainerStyled,
  args: { children: "Inhalt", className: "p-6" },
} satisfies Meta<typeof ContainerStyled>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Card: Story = { args: { variant: "card" } };
export const Hue: Story = {
  args: { appColor: { type: "color-oklch-hue", oklchHue: 284 } },
};
export const RGB: Story = {
  args: { appColor: { type: "color-rgb", red: 90, green: 180, blue: 100 } },
};
export const Opacity: Story = {
  args: {
    appColor: {
      type: "color-rgb",
      red: 90,
      green: 180,
      blue: 100,
      opacity: 0.4,
    },
  },
};
export const Interactive: Story = {
  args: {
    interactive: true,
    variant: "card",
    appColor: { type: "color-oklch-hue", oklchHue: 284 },
  },
};
export const Empty: Story = { args: { children: undefined } };

export const Hover: Story = {
  ...Interactive,
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByText("Inhalt"));
  },
};
