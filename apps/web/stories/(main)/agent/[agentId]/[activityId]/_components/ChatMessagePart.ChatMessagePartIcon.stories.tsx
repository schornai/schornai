import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessagePartIcon } from "../../../../../../app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePart";

const meta = {
  title: "Web/(main)/agent/[agentId]/[activityId]/ChatMessagePartIcon",
  component: ChatMessagePartIcon,
  args: { partType: "file" },
} satisfies Meta<typeof ChatMessagePartIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const PartType_file: Story = { args: {} };
export const PartType_custom: Story = { args: { partType: "custom" } };
export const PartType_text: Story = { args: { partType: "text" } };
export const PartType_reasoning: Story = { args: { partType: "reasoning" } };
export const PartType_dynamic_tool: Story = {
  args: { partType: "dynamic-tool" },
};
export const PartType_source_url: Story = { args: { partType: "source-url" } };
export const PartType_source_document: Story = {
  args: { partType: "source-document" },
};
export const PartType_reasoning_file: Story = {
  args: { partType: "reasoning-file" },
};
export const PartType_step_start: Story = { args: { partType: "step-start" } };
export const PartType_tool_storage_list: Story = {
  args: { partType: "tool-storage-list" },
};
export const PartType_tool_storage_read_file: Story = {
  args: { partType: "tool-storage-read-file" },
};
export const PartType_tool_storage_write_file: Story = {
  args: { partType: "tool-storage-write-file" },
};
export const PartType_tool_storage_search: Story = {
  args: { partType: "tool-storage-search" },
};
export const PartType_data_file: Story = { args: { partType: "data-file" } };
export const PartType_data_role: Story = { args: { partType: "data-role" } };

export const MCP: Story = { args: { partType: "tool-mcp" } };
