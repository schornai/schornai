import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorDocs } from "../../../../app/(main)/agent/_components/AgentEditorDocs";

const meta = {
  title: "Web/(main)/agent/AgentEditorDocs",
  component: AgentEditorDocs,
  args: {},
} satisfies Meta<typeof AgentEditorDocs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const Opened: Story = { play: openDisclosure };
