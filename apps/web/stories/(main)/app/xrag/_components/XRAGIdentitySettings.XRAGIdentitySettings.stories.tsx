import { within, waitFor, expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGIdentitySettings } from "../../../../../app/_components/xrag/XRAGIdentitySettings";
const meta = {
  title: "Web/(main)/app/xrag/XRAGIdentitySettings",
  component: XRAGIdentitySettings,
  args: { kind: "agent", id: "agent" },
  parameters: {
    serviceFixtures: { actionResult: { globalId: "team/my-agent" } },
  },
} satisfies Meta<typeof XRAGIdentitySettings>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(within(canvasElement).getByRole("textbox")).toHaveValue(
        "team/my-agent",
      ),
    );
  },
};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
