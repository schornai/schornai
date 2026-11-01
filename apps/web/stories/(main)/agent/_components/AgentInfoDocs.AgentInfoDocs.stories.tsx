import { openDisclosure } from "../../../../.storybook/interaction-helpers";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AgentInfoDocs } from "../../../../app/(main)/agent/_components/AgentInfoDocs";

const meta = {
  title: "Web/(main)/agent/AgentInfoDocs",
  component: AgentInfoDocs,
  args: {
    docs: "# Dokumentation\n\nEin Beispiel.",
    editAgentPathname: "/",
    editDefaultDocs: "Beispiel",
    editable: false,
  },
} satisfies Meta<typeof AgentInfoDocs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Editable_false: Story = { args: {} };
export const Editable_true: Story = { args: { editable: true } };
export const EditAgentPathname_missing: Story = {
  args: { editAgentPathname: undefined },
};
export const EditDefaultDocs_missing: Story = {
  args: { editDefaultDocs: undefined },
};
export const Editable_missing: Story = { args: { editable: undefined } };
export const Opened: Story = { play: openDisclosure };
