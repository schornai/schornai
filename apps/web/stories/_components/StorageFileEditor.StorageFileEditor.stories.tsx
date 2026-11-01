import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { StorageFileEditor } from "../../app/_components/StorageFileEditor";
const meta = {
  title: "Web/StorageFileEditor",
  component: StorageFileEditor,
  args: {
    file: {
      file: true,
      name: "notes.md",
      path: "notes.md",
      type: "text/markdown",
      size: 20,
      createdAtISO: "2026-10-17",
      updatedAtISO: "2026-10-17",
    },
    storage: {
      type: "documentRepository",
      documentRepositoryId: "repo",
      workspaceId: "workspace",
    },
    content: {
      type: "mdc",
      current: "# Notizen\n\nEin Text mit Umlauten: äöü.\n\nconst answer = 42;",
      versions: [],
    },
  },
} satisfies Meta<typeof StorageFileEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = {
  parameters: { scenario: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Speichern|Save/ }),
    );
    await canvas.findByRole("alert");
  },
};
export const Transcript: Story = {
  args: {
    content: {
      type: "transcript",
      textOverride: "Korrigierter Transkripttext.",
      segments: [],
    },
  },
};
