import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ChatExpirationSettings } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatExpirationSettings";
const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatExpirationSettings",
  component: ChatExpirationSettings,
  args: {
    agentId: "11111111-1111-4111-8111-111111111111",
    activityId: "22222222-2222-4222-8222-222222222222",
    expiration: { seconds: null, expiresAt: null },
  },
} satisfies Meta<typeof ChatExpirationSettings>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Scheduled: Story = {
  args: { expiration: { seconds: 86400, expiresAt: "2030-01-02T12:00:00Z" } },
};
export const Configure: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog");
    await expect(
      within(dialog).getByRole("spinbutton", { name: "Löschen nach" }),
    ).toHaveValue(1);
    await expect(within(dialog).getByText("Tage")).toBeInTheDocument();
  },
};
export const Disable: Story = { args: Scheduled.args, play: Configure.play };
export const Invalid: Story = {
  play: async (context) => {
    await Configure.play!(context);
    const dialog = within(context.canvasElement.ownerDocument.body).getByRole(
      "dialog",
    );
    await userEvent.clear(within(dialog).getByRole("spinbutton"));
    await userEvent.type(within(dialog).getByRole("spinbutton"), "366");
    await expect(
      within(dialog).getByRole("button", { name: "Löschfrist speichern" }),
    ).toBeDisabled();
  },
};
export const Error: Story = {
  parameters: { scenario: "error" },
  play: async (context) => {
    await Configure.play!(context);
    const dialog = within(context.canvasElement.ownerDocument.body).getByRole(
      "dialog",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Löschfrist speichern" }),
    );
    await expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
  },
};
