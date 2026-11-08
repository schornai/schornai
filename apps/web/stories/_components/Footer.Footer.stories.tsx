import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Footer } from "../../app/_components/Footer";
import { expect, userEvent, within } from "storybook/test";

const meta = {
  title: "Web/Footer",
  component: Footer,
  // Stable visual fixture: release metadata changes must not change snapshots.
  args: { releaseName: "December 2026 Development Build 7" },
} satisfies Meta<typeof Footer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };

export const LanguageMenu: Story = {
  globals: { locale: "en" },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("combobox", { name: "Language" }),
    );
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findAllByRole("option")).toHaveLength(26);
    await expect(
      body.getByRole("option", { name: "Gaeilge" }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("option", { name: "Українська" }),
    ).toBeInTheDocument();
    await expect(
      body.getByRole("option", { name: "العربية" }),
    ).toBeInTheDocument();
  },
};

export const Arabic: Story = { globals: { locale: "ar" } };
export const Ukrainian: Story = { globals: { locale: "uk" } };
