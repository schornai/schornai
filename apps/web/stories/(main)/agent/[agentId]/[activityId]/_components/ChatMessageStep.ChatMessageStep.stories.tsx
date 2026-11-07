import { repeatFixtures } from "../../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessageStep } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessageStep";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessageStep",
  component: ChatMessageStep,
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    parts: [
      {
        state: "streaming",
        type: "text",
        text: "Eine Beispielnachricht.",
        providerMetadata: {},
      },
    ],
  },
} satisfies Meta<typeof ChatMessageStep>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AgentColor_color_oklch_hue_color_oklch_hue: Story = { args: {} };
export const AgentColor_color_rgb_color_rgb: Story = {
  args: {
    agentColor: {
      type: "color-rgb",
      blue: 200,
      green: 80,
      red: 100,
      opacity: 0.6,
    },
  },
};
export const AgentColor_missing: Story = { args: { agentColor: undefined } };
export const PartsEmpty: Story = { args: { parts: [] } };
export const PartsMultiple: Story = {
  args: { parts: repeatFixtures(meta.args["parts"]) },
};

export const MCP: Story = {
  args: {
    parts: [
      {
        type: "tool-mcp",
        toolCallId: "mcp",
        state: "output-available",
        input: { serverId: "service", toolName: "list_tasks" },
        output: { content: [] },
      },
      { type: "reasoning", state: "done", text: "Aufgaben wurden geprüft." },
    ],
  },
};

export const PlatformGrouped: Story = {
  args: {
    parts: [
      {
        type: "tool-platform_repository_create",
        toolCallId: "repository",
        state: "output-available",
        input: { repository: { name: "Demo" } },
        output: { documentRepositoryId: "demo" },
      },
      { type: "reasoning", state: "done", text: "Die Ablage ist bereit." },
      {
        type: "tool-platform_file_write",
        toolCallId: "file-1",
        state: "output-available",
        input: { path: "Onboarding.md", text: "Willkommen" },
        output: { saved: true },
      },
      {
        type: "tool-platform_file_write",
        toolCallId: "file-2",
        state: "output-available",
        input: { path: "Reisekosten.md", text: "Richtlinien" },
        output: { saved: true },
      },
    ],
  },
};
