import { expect, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabsChat } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/TabsChat";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/TabsChat",
  component: TabsChat,
  args: {
    activityId: "11111111-1111-4111-8111-111111111111",
    agentId: "11111111-1111-4111-8111-111111111111",
    pathSegment: "chat",
  },
} satisfies Meta<typeof TabsChat>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole("button", { name: "Dokumentation" }),
    ).not.toBeInTheDocument();
  },
};
export const PathSegment_chat: Story = { args: {} };
export const PathSegment_files: Story = { args: { pathSegment: "files" } };
export const PathSegment_info: Story = { args: { pathSegment: "info" } };

export const WithDocumentation: Story = {
  args: { hasDocumentation: true },
  play: async ({ canvasElement }) => {
    const links = within(canvasElement).getAllByRole("button");
    await expect(links.map((link) => link.textContent?.trim())).toEqual([
      "Chat",
      "Dateien",
      "Dokumentation",
      "Info",
    ]);
    await expect(links[2]).toHaveAttribute(
      "href",
      "/agent/11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111/documentation",
    );
  },
};
export const PathSegment_documentation: Story = {
  args: { pathSegment: "documentation", hasDocumentation: true },
};
