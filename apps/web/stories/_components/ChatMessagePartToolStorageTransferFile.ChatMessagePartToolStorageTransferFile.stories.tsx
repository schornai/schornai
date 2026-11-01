import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartToolStorageTransferFile } from "../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageTransferFile";
import { expect, userEvent, within } from "storybook/test";
const meta = {
  title: "Web/Agent/ChatMessagePartToolStorageTransferFile",
  component: ChatMessagePartToolStorageTransferFile,
  args: {
    part: {
      type: "tool-storage-copy-file",
      toolCallId: "transfer",
      state: "output-available",
      input: {
        fromPath: "this_conversation/notes.txt",
        toPath: "docs/notes.txt",
      },
      output: {
        ok: true,
        processing: "queued",
        storage: {
          type: "documentRepository",
          workspaceId: "workspace",
          documentRepositoryId: "repo",
        },
        storagePath: "notes.txt",
        file: {
          file: true,
          name: "notes.txt",
          path: "notes.txt",
          type: "text/plain",
          size: 42,
          createdAtISO: "2026-01-15",
          updatedAtISO: "2026-01-15",
        },
      },
    },
  },
} satisfies Meta<typeof ChatMessagePartToolStorageTransferFile>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Move: Story = {
  args: { part: { ...meta.args.part, type: "tool-storage-move-file" } },
};
export const Error: Story = {
  args: {
    part: {
      ...meta.args.part,
      output: {
        ok: false,
        error: "A destination file already exists. Nothing was overwritten.",
      },
    },
  },
};
export const ProcessingError: Story = {
  args: {
    part: {
      ...meta.args.part,
      output: { ...meta.args.part.output, processing: "error" },
    },
  },
};

export const Expanded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button"));
    await expect(
      canvas.getByRole("link", {
        name: /Zieldatei öffnen|Open destination file/,
      }),
    ).toBeVisible();
  },
};
export const Pending: Story = {
  args: {
    part: { ...meta.args.part, state: "input-streaming", output: undefined },
  },
};
export const Running: Story = {
  args: {
    part: { ...meta.args.part, state: "input-available", output: undefined },
  },
};
export const Approval: Story = {
  args: {
    part: {
      ...meta.args.part,
      state: "approval-requested",
      approval: { id: "approval" },
      output: undefined,
    },
  },
};
export const Denied: Story = {
  args: {
    part: {
      ...meta.args.part,
      state: "output-denied",
      approval: { id: "approval", approved: false },
      output: undefined,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button")).toHaveTextContent(
      /abgelehnt|denied/,
    );
    await userEvent.click(canvas.getByRole("button"));
    await expect(canvas.getByRole("status")).toHaveTextContent(
      /keine Datei|No file/,
    );
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};
export const ExecutionError: Story = {
  args: {
    part: {
      ...meta.args.part,
      state: "output-error",
      errorText: "Transfer failed.",
      output: undefined,
    },
  },
};
