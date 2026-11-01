import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { supportedLanguages } from "../../../../../lib/languages";
import { ThemeLanguageAdd } from "../../../../../app/(settings)/settings/theme/_components/ThemeLanguageAdd";

const meta = {
  title: "Web/(settings)/settings/theme/ThemeLanguageAdd",
  component: ThemeLanguageAdd,
  args: { languages: [], onAdd: fn() },
} satisfies Meta<typeof ThemeLanguageAdd>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const AllLanguagesAdded: Story = {
  args: { languages: [...supportedLanguages] },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Sprache hinzufügen" }),
    ).toBeDisabled();
  },
};
export const PrimaryLanguagesAdded: Story = {
  args: { languages: ["de", "en"] },
  play: async ({ canvas, canvasElement, userEvent }) => {
    const add = canvas.getByRole("button", { name: "Sprache hinzufügen" });
    await expect(add).toBeEnabled();
    await userEvent.click(add);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("combobox"));
    await expect(await body.findAllByRole("option")).toHaveLength(
      supportedLanguages.length - 2,
    );
    await expect(
      body.queryByRole("option", { name: "Deutsch" }),
    ).not.toBeInTheDocument();
    await expect(
      body.queryByRole("option", { name: "Englisch" }),
    ).not.toBeInTheDocument();
  },
};
export const Pending: Story = { args: { disabled: true } };
