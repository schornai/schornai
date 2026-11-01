import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Sidebar } from "../../app/_components/Sidebar";
import { expect, waitFor } from "storybook/test";

const meta = {
  title: "Web/Sidebar",
  component: Sidebar,
  tags: ["async-component"],
  args: { children: "Beispielinhalt" },
  decorators: [
    (Story) => (
      // Keep the sidebar inside the preview's scrolling container.
      <div className="relative h-[800px] w-64 [&_[data-slot=sidebar-container]]:absolute [&_[data-slot=sidebar-container]]:h-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sidebar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
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
};
