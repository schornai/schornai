import { userEvent, within, expect } from "storybook/test";
import { openDialog } from "../../../../.storybook/interaction-helpers";
import { repeatFixtures } from "../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorRoleMCPs } from "../../../../app/(main)/agent/_components/AgentEditorRoleMCPs";

const meta = {
  title: "Web/(main)/agent/AgentEditorRoleMCPs",
  component: AgentEditorRoleMCPs,
  args: {
    mcps: [
      {
        headers: {},
        id: "11111111-1111-4111-8111-111111111111",
        type: "http",
        url: "/brand/squared.png",
        name: "Beispiel",
      },
    ],
    roleId: "11111111-1111-4111-8111-111111111111",
    roleIndex: 1,
  },
} satisfies Meta<typeof AgentEditorRoleMCPs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const McpsEmpty: Story = { args: { mcps: [] } };
export const McpsMultiple: Story = {
  args: { mcps: repeatFixtures(meta.args["mcps"]) },
};
export const ConfirmationOpened: Story = { play: openDialog };

export const OAuthOpened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "OAuth-App" }));
    await expect(canvas.getByRole("combobox")).toBeVisible();
  },
};
export const OAuthSelected: Story = {
  args: {
    mcps: [
      {
        ...meta.args.mcps[0]!,
        oauthConnectionId: "00000000-0000-4000-8000-000000000001",
      },
    ],
  },
};
