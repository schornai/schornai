import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { I18nProvider } from "../../app/_components/I18nProvider";

const meta = {
  tags: ["async-component"],
  title: "Web/I18nProvider",
  component: I18nProvider,
  args: { children: "Beispielinhalt" },
} satisfies Meta<typeof I18nProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };
