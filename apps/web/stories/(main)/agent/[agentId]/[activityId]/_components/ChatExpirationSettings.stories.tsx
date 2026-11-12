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
  args: { expiration: { seconds: 43200, expiresAt: "2030-01-02T12:00:00Z" } },
};
export const Enable: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", {
      name: "Selbstlöschende Chats einschalten (12 Stunden)",
    });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    await expect(
      within(canvasElement.ownerDocument.body).queryByRole("dialog"),
    ).not.toBeInTheDocument();
  },
};
export const Disable: Story = {
  args: Scheduled.args,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", {
      name: "Selbstlöschende Chats ausschalten (12 Stunden)",
    });
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(button);
  },
};
export const Pending: Story = {
  parameters: { scenario: "pending" },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button).toBeDisabled();
    await expect(button.querySelectorAll("svg")).toHaveLength(1);
    await expect(button.querySelector(".lucide-clock-fading")).toBeNull();
    await expect(button.querySelector(".lucide-loader-circle")).not.toBeNull();
  },
};
export const Error: Story = { parameters: { scenario: "error" } };

export const ScheduledHover: Story = {
  args: Scheduled.args,
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await expect(button).toHaveClass("text-primary");
    await userEvent.hover(button);
    const tooltip = await within(canvasElement.ownerDocument.body).findByText(
      /Wird am.*gelöscht/,
    );
    await expect(tooltip).toHaveTextContent("02.01.2030");
    await expect(tooltip).toHaveTextContent("13:00");
    await expect(tooltip).toHaveTextContent("Zum Ausschalten klicken.");
  },
};
