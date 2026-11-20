import { userEvent, within, expect, waitFor } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGTransfer } from "../../../../../app/(main)/app/xrag/_components/XRAGTransfer";
import { externalModelPreview, modelPreview } from "./externalModels.fixture";
const meta = {
  title: "Web/(main)/app/xrag/XRAGTransfer",
  component: XRAGTransfer,
  args: {
    uploadId: "11111111-1111-4111-8111-111111111111",
    isAdmin: false,
    workspaces: [{ id: "workspace", name: "Beispiel-Arbeitsplatz" }],
  },
  parameters: { serviceFixtures: { actionResult: externalModelPreview } },
} satisfies Meta<typeof XRAGTransfer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Administrator: Story = { args: { isAdmin: true } };
export const NoWorkspaces: Story = { args: { isAdmin: true, workspaces: [] } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Contents: Story = {
  parameters: {
    serviceFixtures: {
      actionResult: {
        ...externalModelPreview,
        entries: [...externalModelPreview.entries, ...modelPreview.entries],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", {
        name: "Support Agent auswählen",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.getByRole("combobox", { name: "Arbeitsplatz" }),
    ).toBeVisible();
  },
};
export const PlatformOnly: Story = {
  parameters: {
    serviceFixtures: { actionResult: modelPreview },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", { name: "Whisper tiny auswählen" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      canvas.queryByRole("combobox", { name: "Arbeitsplatz" }),
    ).not.toBeInTheDocument();
  },
};
export const ExternalModelSelection: Story = {
  parameters: {
    serviceFixtures: { actionResult: externalModelPreview },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Support Agent auswählen" });
    await userEvent.click(canvas.getByRole("button", { name: "Importieren" }));
    const body = within(canvasElement.ownerDocument.body);
    const select = await body.findByRole("combobox", {
      name: "openai · gpt-example",
    });
    await expect(
      body.getByRole("button", { name: "Importieren" }),
    ).toBeDisabled();
    await userEvent.click(select);
    await userEvent.click(
      await body.findByRole("option", {
        name: "OpenAI Projekt · external:project",
      }),
    );
    await expect(
      body.getByRole("button", { name: "Importieren" }),
    ).toBeEnabled();
  },
};
export const ExternalModelMissing: Story = {
  parameters: {
    serviceFixtures: {
      actionResult: {
        ...externalModelPreview,
        externalModels: [
          { ...externalModelPreview.externalModels[0], candidates: [] },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("button", { name: "Support Agent auswählen" });
    await userEvent.click(canvas.getByRole("button", { name: "Importieren" }));
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText(/Import abgeschlossen/)).toBeVisible();
    await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
  },
};

export const ImportCompleted: Story = {
  parameters: {
    serviceFixtures: {
      actionResult: {
        ...externalModelPreview,
        externalModels: [],
        documentFileCount: 0,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = await canvas.findByRole("button", {
      name: "Importieren",
    });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await expect(
      await canvas.findByText("Import abgeschlossen."),
    ).toBeVisible();
    await expect(
      canvas.queryByText(/Die Dokumentdateien werden/),
    ).not.toBeInTheDocument();
  },
};
export const DocumentsImported: Story = {
  ...ImportCompleted,
  parameters: {
    serviceFixtures: {
      actionResult: {
        ...externalModelPreview,
        externalModels: [],
        entries: [
          {
            ...externalModelPreview.entries[0],
            kind: "documentRepository",
            name: "Handbuch",
          },
        ],
        documentFileCount: 2,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submit = await canvas.findByRole("button", {
      name: "Importieren",
    });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await expect(
      await canvas.findByText(/Die Dokumentdateien werden im Hintergrund/),
    ).toBeVisible();
  },
};
