import { expect } from "storybook/test";
import {
  platformPreviewFile,
  platformPreviewAgent,
  platformPreviewRepository,
} from "../../../../../../.storybook/platform-tool-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartToolPlatform } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolPlatform";
import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolPlatform",
  component: ChatMessagePartToolPlatform,
  args: {
    part: {
      type: "tool-platform_files_list",
      toolCallId: "platform",
      state: "output-available",
      input: { repositoryId: "example", path: "" },
      output: [platformPreviewFile],
    },
  },
} satisfies Meta<typeof ChatMessagePartToolPlatform>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Expanded: Story = { play: openDisclosure };

export const AgentCreated: Story = {
  args: {
    part: {
      type: "tool-platform_agent_create",
      toolCallId: "agent",
      state: "output-available",
      input: { agent: platformPreviewAgent },
      output: { agentId: "created-agent" },
    },
  },
  play: openDisclosure,
};
export const RepositoryCreated: Story = {
  args: {
    part: {
      type: "tool-platform_repository_create",
      toolCallId: "repository",
      state: "output-available",
      input: { repository: platformPreviewRepository },
      output: { documentRepositoryId: "created-repository" },
    },
  },
  play: openDisclosure,
};
export const Failed: Story = {
  args: {
    part: {
      type: "tool-platform_agent_create",
      toolCallId: "agent",
      state: "output-error",
      input: { agent: platformPreviewAgent },
      errorText: "PLATFORM_OPERATION_FAILED",
    },
  },
  play: openDisclosure,
};
export const Denied: Story = {
  args: {
    part: {
      type: "tool-platform_agent_create",
      toolCallId: "agent",
      state: "output-denied",
      input: { agent: platformPreviewAgent },
      approval: { id: "approval", approved: false },
    },
  },
  play: openDisclosure,
};

export const Close: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: /Dateien auflisten/ }),
    );
    await expect(canvas.getByText("Dokument.md")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Schließen" }));
    await expect(canvas.queryByText("Dokument.md")).not.toBeInTheDocument();
  },
};
