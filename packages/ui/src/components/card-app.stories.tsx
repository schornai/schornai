import type { Meta, StoryObj } from "@storybook/react-vite";
import { CardApp } from "./card-app.tsx";
import {
  CardAppHeader,
  CardAppMain,
  CardAppAvatar,
  CardAppContent,
  CardAppName,
  CardAppDescription,
  CardAppFooter,
} from "./card-app.tsx";
const meta = {
  title: "UI/CardApp",
  component: CardApp,
  args: {
    children: (
      <>
        <CardAppHeader>Agent</CardAppHeader>
        <CardAppMain>
          <CardAppAvatar fallback="Storybook Agent" />
          <CardAppContent>
            <CardAppName>Agent</CardAppName>
            <CardAppDescription>Beschreibung</CardAppDescription>
          </CardAppContent>
        </CardAppMain>
        <CardAppFooter>
          <span>Info</span>
          <button>Öffnen</button>
        </CardAppFooter>
      </>
    ),
  },
} satisfies Meta<typeof CardApp>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Color: Story = {
  args: { appColor: { type: "color-oklch-hue", oklchHue: 284 } },
};
export const Interactive: Story = { args: { interactive: true } };
export const Empty: Story = { args: { children: undefined } };
export const LongText: Story = {
  args: {
    children: (
      <CardAppMain>
        <CardAppContent>
          <CardAppName>{"Name ".repeat(10)}</CardAppName>
          <CardAppDescription>{"Beschreibung ".repeat(20)}</CardAppDescription>
        </CardAppContent>
      </CardAppMain>
    ),
  },
};

export const Hover: Story = {
  ...Interactive,
  play: async ({ canvas, userEvent }) => {
    await userEvent.hover(canvas.getByRole("heading", { name: "Agent" }));
  },
};
