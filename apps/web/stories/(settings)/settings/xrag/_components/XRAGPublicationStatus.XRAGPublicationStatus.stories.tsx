import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGPublicationStatus } from "../../../../../app/(settings)/settings/xrag/_components/XRAGPublicationStatus";
const meta = {
  title: "Web/(settings)/settings/xrag/XRAGPublicationStatus",
  component: XRAGPublicationStatus,
  args: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "release.xrag.tar",
  },
} satisfies Meta<typeof XRAGPublicationStatus>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = {
  parameters: {
    scenario: "success",
    serviceFixtures: { actionResult: { state: "published" } },
  },
};
export const Rejected: Story = {
  parameters: {
    scenario: "success",
    serviceFixtures: { actionResult: { state: "error" } },
  },
};
