import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import { ChatMessagePartToolWebSearch } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolWebSearch";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolWebSearch",
  component: ChatMessagePartToolWebSearch,
} satisfies Meta<typeof ChatMessagePartToolWebSearch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Search: Story = {
  args: {
    part: {
      type: "tool-web-search",
      toolCallId: "search",
      state: "output-available",
      input: { query: "Documentation" },
      output: {
        ok: true,
        provider: "brave",
        query: "Documentation",
        results: [
          {
            title: "Documentation",
            url: "https://example.com/docs",
            snippet: "Guides and reference documentation.",
          },
        ],
      },
    },
  },
  play: openDisclosure,
};
export const Empty: Story = {
  args: {
    part: {
      type: "tool-web-search",
      toolCallId: "search",
      state: "output-available",
      input: { query: "No matches" },
      output: { ok: true, provider: "staan", query: "No matches", results: [] },
    },
  },
  play: openDisclosure,
};
