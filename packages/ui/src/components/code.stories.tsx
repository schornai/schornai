import type { Meta, StoryObj } from "@storybook/react-vite";
import { Code } from "./code.tsx";

const meta = {
  title: "UI/Code",
  component: Code,
  args: {
    children: "const answer: number = 42;",
    lang: "typescript",
    fallback: <span>Lädt …</span>,
  },
} satisfies Meta<typeof Code>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const PlainText: Story = {
  args: { lang: "text", children: "Beispiel" },
};
export const Empty: Story = { args: { children: "" } };
export const UnsupportedLanguage: Story = {
  args: { lang: "unknown-language" },
};
export const Multiline: Story = {
  args: {
    lang: "json",
    children: JSON.stringify({ answer: 42, items: [1, 2, 3] }, null, 2),
  },
};
