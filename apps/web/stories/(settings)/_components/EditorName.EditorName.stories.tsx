import { expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditorName } from "../../../app/(settings)/_components/EditorName";

const meta = {
  title: "Web/(settings)/EditorName",
  component: EditorName,
  args: {
    defaultFirstName: "Beispiel",
    defaultLastName: "Beispiel",
    targetUserId: "11111111-1111-4111-8111-111111111111",
  },
} satisfies Meta<typeof EditorName>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DefaultFirstName_missing: Story = {
  args: { defaultFirstName: undefined },
};
export const DefaultLastName_missing: Story = {
  args: { defaultLastName: undefined },
};
export const TargetUserId_missing: Story = {
  args: { targetUserId: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const Dirty: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getAllByRole("textbox")[0]!, " Neu");
    await expect(
      canvas.getByRole("button", { name: /speichern|save/i }),
    ).toBeEnabled();
  },
};
