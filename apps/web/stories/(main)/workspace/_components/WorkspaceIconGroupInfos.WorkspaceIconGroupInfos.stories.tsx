import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WorkspaceIconGroupInfos } from "../../../../app/(main)/workspace/_components/WorkspaceIconGroupInfos";

const meta = {
  title: "Web/(main)/workspace/WorkspaceIconGroupInfos",
  component: WorkspaceIconGroupInfos,
  args: {
    workspace: {
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-15T12:00:00.000Z"),
      name: "Beispiel",
      description: "Eine Beschreibung für Storybook.",
      documentation: "Beispiel",
      autoJoin: false,
      samlMappingUser: "Beispiel",
      samlMappingEditor: "Beispiel",
      samlMappingWorkspaceAdmin: "Beispiel",
      claim: "admin",
    },
  },
} satisfies Meta<typeof WorkspaceIconGroupInfos>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Workspace_missing: Story = { args: { workspace: undefined } };
