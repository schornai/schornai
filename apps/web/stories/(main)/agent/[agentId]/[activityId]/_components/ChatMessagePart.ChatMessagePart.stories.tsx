import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePart } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePart";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePart",
  component: ChatMessagePart,
  args: {
    agentColor: { type: "color-oklch-hue", oklchHue: 284 },
    part: {
      state: "streaming",
      type: "text",
      text: "Eine Beispielnachricht.",
      providerMetadata: {},
    },
  },
} satisfies Meta<typeof ChatMessagePart>;
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
export const Part_text_text: Story = { args: {} };
export const Part_custom_custom: Story = {
  args: {
    part: { type: "custom", kind: "example.reference", providerMetadata: {} },
  },
};
export const Part_reasoning_reasoning: Story = {
  args: {
    part: {
      state: "streaming",
      type: "reasoning",
      id: "11111111-1111-4111-8111-111111111111",
      text: "Eine Beispielnachricht.",
      providerMetadata: {},
    },
  },
};
export const Part_dynamic_tool_input_streaming: Story = {
  args: {
    part: {
      state: "input-streaming",
      type: "dynamic-tool",
      toolName: "Beispiel",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: {},
      callProviderMetadata: {},
    },
  },
};
export const Part_dynamic_tool_input_available: Story = {
  args: {
    part: {
      state: "input-available",
      type: "dynamic-tool",
      toolName: "Beispiel",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: {},
      callProviderMetadata: {},
    },
  },
};
export const Part_dynamic_tool_approval_requested: Story = {
  args: {
    part: {
      state: "approval-requested",
      type: "dynamic-tool",
      toolName: "Beispiel",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: {},
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
export const Part_dynamic_tool_approval_responded: Story = {
  args: {
    part: {
      state: "approval-responded",
      type: "dynamic-tool",
      toolName: "Beispiel",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: {},
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
export const Part_dynamic_tool_output_available: Story = {
  args: {
    part: {
      state: "output-available",
      type: "dynamic-tool",
      toolName: "Beispiel",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: {},
      output: {},
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
export const Part_dynamic_tool_output_error: Story = {
  args: {
    part: {
      state: "output-error",
      type: "dynamic-tool",
      toolName: "Beispiel",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: {},
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
export const Part_dynamic_tool_output_denied: Story = {
  args: {
    part: {
      state: "output-denied",
      type: "dynamic-tool",
      toolName: "Beispiel",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: {},
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
export const Part_source_url_source_url: Story = {
  args: {
    part: {
      type: "source-url",
      sourceId: "11111111-1111-4111-8111-111111111111",
      url: "/brand/squared.png",
      title: "Beispiel",
      providerMetadata: {},
    },
  },
};
export const Part_source_document_source_document: Story = {
  args: {
    part: {
      type: "source-document",
      sourceId: "11111111-1111-4111-8111-111111111111",
      mediaType: "Beispiel",
      title: "Beispiel",
      filename: "Beispiel",
      providerMetadata: {},
    },
  },
};
export const Part_file_file: Story = {
  args: {
    part: {
      type: "file",
      mediaType: "Beispiel",
      filename: "Beispiel",
      url: "/brand/squared.png",
      providerReference: {},
      providerMetadata: {},
    },
  },
};
export const Part_reasoning_file_reasoning_file: Story = {
  args: {
    part: {
      type: "reasoning-file",
      mediaType: "Beispiel",
      url: "/brand/squared.png",
      providerMetadata: {},
    },
  },
};
export const Part_step_start_step_start: Story = {
  args: { part: { type: "step-start" } },
};
export const Part_tool_storage_list_input_streaming: Story = {
  args: {
    part: {
      state: "input-streaming",
      type: "tool-storage-list",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { path: "/beispiel.txt" },
      callProviderMetadata: {},
    },
  },
};
export const Part_tool_storage_list_input_available: Story = {
  args: {
    part: {
      state: "input-available",
      type: "tool-storage-list",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { path: "/beispiel.txt" },
      callProviderMetadata: {},
    },
  },
};
export const Part_tool_storage_list_approval_requested: Story = {
  args: {
    part: {
      state: "approval-requested",
      type: "tool-storage-list",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { path: "/beispiel.txt" },
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
export const Part_tool_storage_list_approval_responded: Story = {
  args: {
    part: {
      state: "approval-responded",
      type: "tool-storage-list",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { path: "/beispiel.txt" },
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
export const Part_tool_storage_list_output_available: Story = {
  args: {
    part: {
      state: "output-available",
      type: "tool-storage-list",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { path: "/beispiel.txt" },
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
export const Part_tool_storage_list_output_error: Story = {
  args: {
    part: {
      state: "output-error",
      type: "tool-storage-list",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { path: "/beispiel.txt" },
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
export const Part_tool_storage_list_output_denied: Story = {
  args: {
    part: {
      state: "output-denied",
      type: "tool-storage-list",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { path: "/beispiel.txt" },
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
export const Part_tool_storage_read_file_input_streaming: Story = {
  args: {
    part: {
      state: "input-streaming",
      type: "tool-storage-read-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { offset: 1, path: "/beispiel.txt" },
      callProviderMetadata: {},
    },
  },
};
export const Part_tool_storage_read_file_input_available: Story = {
  args: {
    part: {
      state: "input-available",
      type: "tool-storage-read-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { offset: 1, path: "/beispiel.txt" },
      callProviderMetadata: {},
    },
  },
};
export const Part_tool_storage_read_file_approval_requested: Story = {
  args: {
    part: {
      state: "approval-requested",
      type: "tool-storage-read-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { offset: 1, path: "/beispiel.txt" },
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
export const Part_tool_storage_read_file_approval_responded: Story = {
  args: {
    part: {
      state: "approval-responded",
      type: "tool-storage-read-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { offset: 1, path: "/beispiel.txt" },
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
export const Part_tool_storage_read_file_output_available: Story = {
  args: {
    part: {
      state: "output-available",
      type: "tool-storage-read-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { offset: 1, path: "/beispiel.txt" },
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
export const Part_tool_storage_read_file_output_error: Story = {
  args: {
    part: {
      state: "output-error",
      type: "tool-storage-read-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { offset: 1, path: "/beispiel.txt" },
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
export const Part_tool_storage_read_file_output_denied: Story = {
  args: {
    part: {
      state: "output-denied",
      type: "tool-storage-read-file",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { offset: 1, path: "/beispiel.txt" },
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
export const Part_tool_storage_write_file_input_streaming: Story = {
  args: {
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
};
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
export const Part_tool_storage_search_input_streaming: Story = {
  args: {
    part: {
      state: "input-streaming",
      type: "tool-storage-search",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { keywords: ["Beispiel"] },
      callProviderMetadata: {},
    },
  },
};
export const Part_tool_storage_search_input_available: Story = {
  args: {
    part: {
      state: "input-available",
      type: "tool-storage-search",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { keywords: ["Beispiel"] },
      callProviderMetadata: {},
    },
  },
};
export const Part_tool_storage_search_approval_requested: Story = {
  args: {
    part: {
      state: "approval-requested",
      type: "tool-storage-search",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { keywords: ["Beispiel"] },
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
export const Part_tool_storage_search_approval_responded: Story = {
  args: {
    part: {
      state: "approval-responded",
      type: "tool-storage-search",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { keywords: ["Beispiel"] },
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
export const Part_tool_storage_search_output_available: Story = {
  args: {
    part: {
      state: "output-available",
      type: "tool-storage-search",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { keywords: ["Beispiel"] },
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
export const Part_tool_storage_search_output_error: Story = {
  args: {
    part: {
      state: "output-error",
      type: "tool-storage-search",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { keywords: ["Beispiel"] },
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
export const Part_tool_storage_search_output_denied: Story = {
  args: {
    part: {
      state: "output-denied",
      type: "tool-storage-search",
      toolCallId: "11111111-1111-4111-8111-111111111111",
      title: "Beispiel",
      toolMetadata: {},
      providerExecuted: false,
      input: { keywords: ["Beispiel"] },
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
export const Part_data_file_data_file: Story = {
  args: {
    part: {
      type: "data-file",
      id: "11111111-1111-4111-8111-111111111111",
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Beispiel",
        type: "text",
        url: "/brand/squared.png",
      },
    },
  },
};
export const Part_data_role_data_role: Story = {
  args: {
    part: {
      type: "data-role",
      id: "11111111-1111-4111-8111-111111111111",
      data: { currentTry: 1, state: "pending" },
    },
  },
};
export const AgentColor_missing: Story = { args: { agentColor: undefined } };

export const MCP: Story = {
  args: {
    part: {
      type: "tool-mcp",
      toolCallId: "mcp",
      state: "output-available",
      input: { serverId: "service", toolName: "list_tasks" },
      output: { content: [] },
    },
  },
};
