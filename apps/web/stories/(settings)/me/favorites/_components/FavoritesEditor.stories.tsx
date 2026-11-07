import { expect, userEvent } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FavoritesEditor } from "../../../../../app/(settings)/me/favorites/_components/FavoritesEditor";

const meta = {
  title: "Web/(settings)/me/FavoritesEditor",
  component: FavoritesEditor,
  args: {
    config: {
      favorites: [
        { id: "one", type: "agent" },
        { id: "two", type: "workspace" },
        { id: "three", type: "documentRepository" },
      ],
      showInSidebar: true,
      version: "favorites-v2",
    },
    appearances: {
      "agent:one": {
        name: "Assistent",
        color: { type: "color-oklch-hue", oklchHue: 284 },
        icon: { type: "icon-lucide", iconName: "bot" },
      },
      "workspace:two": {
        name: "Mein Arbeitsplatz",
        color: undefined,
        icon: undefined,
      },
    },
  },
} satisfies Meta<typeof FavoritesEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = {
  args: { config: { ...meta.args.config, favorites: [] } },
};
export const Hidden: Story = {
  args: { config: { ...meta.args.config, showInSidebar: false } },
};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };

export const EditAndReset: Story = {
  async play({ canvas }) {
    const save = canvas.getByRole("button", { name: "Speichern" });
    await expect(save).toBeDisabled();
    await userEvent.click(canvas.getByRole("switch"));
    await expect(save).toBeEnabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Assistent aus Favoriten entfernen" }),
    );
    await expect(canvas.queryByRole("alertdialog")).not.toBeInTheDocument();
    await expect(canvas.queryByText("Assistent")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Zurücksetzen" }));
    await expect(canvas.getByText("Assistent")).toBeVisible();
    await expect(canvas.getByRole("switch")).toBeChecked();
    await expect(save).toBeDisabled();
  },
};
