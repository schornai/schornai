import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";
import { Sidebar } from "../../../app/(main)/_components/Sidebar";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/Sidebar",
  component: Sidebar,
  args: {},
  decorators: [
    (Story) => (
      // Keep the sidebar inside the preview's scrolling container.
      <div className="relative h-[800px] w-64 [&_[data-slot=sidebar-container]]:absolute [&_[data-slot=sidebar-container]]:h-full">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    await expect(
      await canvas.findByRole(
        "button",
        { name: /Alex Beispiel/ },
        { timeout: 5000 },
      ),
    ).toBeVisible();
    await waitFor(
      () =>
        expect(canvasElement.querySelector('a[href="/"] svg')).toBeVisible(),
      { timeout: 5000 },
    );
  },
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };

export const Arabic: Story = { globals: { locale: "ar" } };
