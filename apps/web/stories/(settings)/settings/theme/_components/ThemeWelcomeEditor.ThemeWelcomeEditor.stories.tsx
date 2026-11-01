import { useState } from "react";
import { fn } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ThemeWelcomeEditor } from "../../../../../app/(settings)/settings/theme/_components/ThemeWelcomeEditor";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeWelcomeEditor",
  component: ThemeWelcomeEditor,
  render: function Render(args) {
    const [localized, onChange] = useState(args.localized);
    return (
      <ThemeWelcomeEditor {...args} localized={localized} onChange={onChange} />
    );
  },
  args: {
    onChange: fn(),
    localized: {
      de: "# Willkommen\n\nDein **KI-Assistent** für den Arbeitsalltag.",
      en: "# Welcome\n\nYour **AI assistant** for everyday work.",
    },
  },
} satisfies Meta<typeof ThemeWelcomeEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Sprache hinzufügen" }),
    ).toBeEnabled();
  },
};
export const Preview: Story = {
  args: {
    localized: {
      de: "# Willkommen\n\nDein **KI-Assistent** für den Arbeitsalltag.",
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /Vorschau|Preview/ }),
    );
    await expect(
      canvas.getByRole("heading", { name: "Willkommen" }),
    ).toBeVisible();
  },
};
export const Empty: Story = { args: { localized: {} } };
export const Pending: Story = { args: { disabled: true } };
export const Error: Story = { parameters: { scenario: "error" } };
