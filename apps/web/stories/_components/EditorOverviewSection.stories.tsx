import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Shapes } from "lucide-react";
import { expect } from "storybook/test";
import { EditorOverviewSection } from "../../app/_components/EditorOverviewSection";
const meta = {
  title: "Web/EditorOverviewSection",
  component: EditorOverviewSection,
  args: {
    view: "roles",
    icon: Shapes,
    title: "Rollen",
    description:
      "Lege fest, wie der Agent antwortet und welche Werkzeuge er verwenden kann.",
    children: <p>Recherche und Faktenprüfung</p>,
  },
} satisfies Meta<typeof EditorOverviewSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Desktop: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Rollen" })).toHaveAttribute(
      "href",
      "?view=roles",
    );
  },
};
export const Mobile: Story = {
  ...Desktop,
  decorators: [
    (Story) => (
      <div className="w-[393px] max-w-full">
        <Story />
      </div>
    ),
  ],
};
