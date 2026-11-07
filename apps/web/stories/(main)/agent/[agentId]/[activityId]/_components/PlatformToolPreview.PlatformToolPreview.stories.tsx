import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { PlatformToolPreview } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/PlatformToolPreview";
import {
  platformPreviewFile,
  platformPreviewAgent,
  platformPreviewRepository,
} from "../../../../../../.storybook/platform-tool-fixtures";
const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/PlatformToolPreview",
  component: PlatformToolPreview,
  args: {
    toolName: "platform_agent_create",
    value: { agent: platformPreviewAgent },
  },
} satisfies Meta<typeof PlatformToolPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Agent: Story = {};
export const Repository: Story = {
  args: {
    toolName: "platform_repository_create",
    value: { repository: platformPreviewRepository },
  },
};
export const Files: Story = {
  args: {
    toolName: "platform_files_list",
    result: true,
    input: { repositoryId: "demo", path: "team" },
    value: [
      platformPreviewFile,
      {
        ...platformPreviewFile,
        name: "Reisekosten.md",
        path: "team/Reisekosten.md",
      },
    ],
  },
};
export const FileWrite: Story = {
  args: {
    toolName: "platform_file_write",
    value: {
      repositoryId: "demo",
      path: "team/Onboarding.md",
      text: "# Willkommen\n\n1. Konto einrichten\n2. Team kennenlernen",
    },
  },
};
export const Invitation: Story = {
  args: {
    toolName: "platform_user_access_message",
    value: {
      email: "alice@example.test",
      subject: "Ihr Zugang",
      body: "Guten Tag Alice,\n\nIhr Zugang ist bereit.",
      resetUrl: "https://schorn.example/signin/reset",
    },
  },
};
export const Confidential: Story = {
  args: {
    toolName: "platform_connection_save",
    value: {
      name: "Provider",
      apiKey: "never-render-this-secret",
      headers: { Authorization: "never-render-this-secret" },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByText(/never-render-this-secret/),
    ).not.toBeInTheDocument();
  },
};
export const Empty: Story = {
  args: {
    toolName: "platform_files_list",
    value: [],
    result: true,
    input: { repositoryId: "demo", path: "" },
  },
};

export const FileRead: Story = {
  args: {
    toolName: "platform_file_read",
    result: true,
    input: { repositoryId: "demo", path: "team/Dokument.md" },
    value: {
      type: "mdc",
      current: "# Willkommen\n\nDas ist die normale Dateivorschau.",
      versions: [],
    },
  },
};
export const FileSaved: Story = {
  args: {
    toolName: "platform_file_write",
    result: true,
    input: {
      repositoryId: "demo",
      path: "team/Dokument.md",
      text: "# Willkommen\n\nGespeicherter Inhalt.",
    },
    value: { status: "saved", file: platformPreviewFile, indexQueued: true },
  },
};
export const FileConflict: Story = {
  args: {
    toolName: "platform_file_write",
    result: true,
    input: { repositoryId: "demo", path: "team/Dokument.md", text: "Änderung" },
    value: { status: "conflict" },
  },
};
