import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGExportButton } from "../../../../../app/_components/xrag/XRAGExportButton";

const meta = {
  title: "Web/(main)/app/xrag/XRAGExportButton",
  component: XRAGExportButton,
  args: { kind: "model", id: "example-model" },
  parameters: {
    serviceFixtures: {
      actionResult: {
        name: "example-model.xrag.tar",
        url: "https://example.test/example-model.xrag.tar",
      },
    },
  },
} satisfies Meta<typeof XRAGExportButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
