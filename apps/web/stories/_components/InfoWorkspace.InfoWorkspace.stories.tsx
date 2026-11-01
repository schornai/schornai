import { openDisclosure } from "../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InfoWorkspace } from "../../app/_components/InfoWorkspace";

const meta = {
  title: "Web/InfoWorkspace",
  component: InfoWorkspace,
  args: {
    editPathname: "/",
    editDefaultWorkspaceId: "11111111-1111-4111-8111-111111111111",
    editable: false,
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
} satisfies Meta<typeof InfoWorkspace>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const EditPathname_missing: Story = {
  args: { editPathname: undefined },
};
export const EditDefaultWorkspaceId_missing: Story = {
  args: { editDefaultWorkspaceId: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
export const Workspace_missing: Story = { args: { workspace: undefined } };
export const Opened: Story = { play: openDisclosure };
