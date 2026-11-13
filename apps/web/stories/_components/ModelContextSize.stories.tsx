import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ModelContextSize } from "../../app/_components/ModelContextSize";
const meta = {
  title: "Web/ModelContextSize",
  component: ModelContextSize,
  args: { contextSize: 32768 },
} satisfies Meta<typeof ModelContextSize>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Known: Story = {};
export const Unknown: Story = { args: { contextSize: undefined } };
export const UnknownTooltip: Story = {
  args: { contextSize: undefined },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.tab();
    canvas.getByText("Keine Kontextgröße").focus();
    await expect(canvas.getByText("Keine Kontextgröße")).toHaveFocus();
    await expect(
      await within(canvasElement.ownerDocument.body).findByText(
        "Ohne Kontextgröße ist die automatische Kontextkomprimierung deaktiviert.",
      ),
    ).toBeVisible();
  },
};
