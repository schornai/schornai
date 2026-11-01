import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentEditorDocsRecommendedMessage } from "../../../../app/(main)/agent/_components/AgentEditorDocsRecommendedMessage";

const meta = {
  title: "Web/(main)/agent/AgentEditorDocsRecommendedMessage",
  component: AgentEditorDocsRecommendedMessage,
  args: {
    defaultOpen: false,
    index: 1,
    recommendedMessage: {
      id: "11111111-1111-4111-8111-111111111111",
      message: "Beispiel",
      label: "Beispiel",
    },
  },
} satisfies Meta<typeof AgentEditorDocsRecommendedMessage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const DefaultOpen_false: Story = { args: {} };
export const DefaultOpen_true: Story = { args: { defaultOpen: true } };
export const DefaultOpen_missing: Story = { args: { defaultOpen: undefined } };
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
