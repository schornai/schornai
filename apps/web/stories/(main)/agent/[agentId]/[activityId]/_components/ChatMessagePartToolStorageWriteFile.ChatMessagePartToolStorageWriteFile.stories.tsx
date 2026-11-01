import { openDisclosure } from "../../../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartToolStorageWriteFile } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolStorageWriteFile";

const meta = {
  title:
    "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartToolStorageWriteFile",
  component: ChatMessagePartToolStorageWriteFile,
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    part: {
      state: "input-streaming",
      type: "tool-storage-write-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { content: "Beispielinhalt", path: "/beispiel.txt" },
      callProviderMetadata: {},
    },
  },
} satisfies Meta<typeof ChatMessagePartToolStorageWriteFile>;
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
export const Part_tool_storage_write_file_input_streaming: Story = { args: {} };
export const Part_tool_storage_write_file_input_available: Story = {
  args: {
    part: {
      state: "input-available",
      type: "tool-storage-write-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { content: "Beispielinhalt", path: "/beispiel.txt" },
      callProviderMetadata: {},
    },
  },
};
export const Part_tool_storage_write_file_approval_requested: Story = {
  args: {
    part: {
      state: "approval-requested",
      type: "tool-storage-write-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { content: "Beispielinhalt", path: "/beispiel.txt" },
      callProviderMetadata: {},
      approval: {
        id: "11111111-1111-4111-8111-111111111111",
        descriptor: {},
        requestReason: "Beispiel",
        isAutomatic: false,
        signature: "Beispiel",
      },
    },
  },
};
export const Part_tool_storage_write_file_approval_responded: Story = {
  args: {
    part: {
      state: "approval-responded",
      type: "tool-storage-write-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { content: "Beispielinhalt", path: "/beispiel.txt" },
      callProviderMetadata: {},
      approval: {
        id: "11111111-1111-4111-8111-111111111111",
        approved: false,
        descriptor: {},
        requestReason: "Beispiel",
        reason: "Beispiel",
        isAutomatic: false,
        signature: "Beispiel",
      },
    },
  },
};
export const Part_tool_storage_write_file_output_available: Story = {
  args: {
    part: {
      state: "output-available",
      type: "tool-storage-write-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { content: "Beispielinhalt", path: "/beispiel.txt" },
      output: { ok: false, error: "Beispiel" },
      callProviderMetadata: {},
      resultProviderMetadata: {},
      preliminary: false,
      approval: {
        id: "11111111-1111-4111-8111-111111111111",
        approved: true,
        descriptor: {},
        requestReason: "Beispiel",
        reason: "Beispiel",
        isAutomatic: false,
        signature: "Beispiel",
      },
    },
  },
};
export const Part_tool_storage_write_file_output_error: Story = {
  args: {
    part: {
      state: "output-error",
      type: "tool-storage-write-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { content: "Beispielinhalt", path: "/beispiel.txt" },
      rawInput: {},
      errorText: "Beispiel",
      callProviderMetadata: {},
      resultProviderMetadata: {},
      approval: {
        id: "11111111-1111-4111-8111-111111111111",
        approved: true,
        descriptor: {},
        requestReason: "Beispiel",
        reason: "Beispiel",
        isAutomatic: false,
        signature: "Beispiel",
      },
    },
  },
};
export const Part_tool_storage_write_file_output_denied: Story = {
  args: {
    part: {
      state: "output-denied",
      type: "tool-storage-write-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { content: "Beispielinhalt", path: "/beispiel.txt" },
      callProviderMetadata: {},
      approval: {
        id: "11111111-1111-4111-8111-111111111111",
        approved: false,
        descriptor: {},
        requestReason: "Beispiel",
        reason: "Beispiel",
        isAutomatic: false,
        signature: "Beispiel",
      },
    },
  },
};
export const AgentColor_missing: Story = { args: { agentColor: undefined } };
export const Opened: Story = { play: openDisclosure };
