import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationEditor } from "../../../../app/(main)/app/automation/_components/AutomationEditor";
import { agents, repositories, automation } from "./fixtures";
const meta = {
  title: "Web/(main)/app/automation/AutomationEditor",
  component: AutomationEditor,
  args: { agents, repositories },
  parameters: {
    nextjs: { navigation: { pathname: "/app/automation/new", query: {} } },
  },
} satisfies Meta<typeof AutomationEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Weekly: Story = {
  args: { initial: automation },
  parameters: { nextjs: { navigation: { query: { view: "trigger" } } } },
};
export const Monthly: Story = {
  parameters: { nextjs: { navigation: { query: { view: "trigger" } } } },
  args: {
    initial: {
      ...automation,
      trigger: {
        type: "time",
        schedule: {
          kind: "monthly",
          day: 31,
          time: "09:00",
          timezone: "Europe/Vienna",
        },
      },
    },
  },
};
export const Once: Story = {
  parameters: { nextjs: { navigation: { query: { view: "trigger" } } } },
  args: {
    initial: {
      ...automation,
      trigger: {
        type: "time",
        schedule: { kind: "once", at: "2030-01-02T09:00:00Z" },
      },
    },
  },
};
export const Storage: Story = {
  parameters: { nextjs: { navigation: { query: { view: "trigger" } } } },
  args: {
    initial: {
      ...automation,
      trigger: {
        type: "storage",
        storage: {
          type: "documentRepository",
          documentRepositoryId: "demo",
          workspaceId: "demo",
        },
        folder: "Eingang",
        includeSubfolders: true,
        events: ["processed"],
        attachment: "copy",
      },
    },
  },
};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Paused: Story = {
  parameters: { nextjs: { navigation: { query: { view: "default" } } } },
  args: { initial: { ...automation, enabled: false } },
};

export const Settings: Story = {
  args: { initial: automation },
  parameters: { nextjs: { navigation: { query: { view: "settings" } } } },
};
export const Chat: Story = {
  args: { initial: automation },
  parameters: { nextjs: { navigation: { query: { view: "chat" } } } },
};
export const Trigger: Story = {
  parameters: { nextjs: { navigation: { query: { view: "trigger" } } } },
};

export const FolderPicker: Story = {
  ...Storage,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Team-Dokumente / Eingang",
      }),
    );
    await expect(
      await within(document.body).findByRole("dialog"),
    ).toBeVisible();
  },
};

export const Options: Story = {
  ...Settings,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Optionen" }),
    );
    await expect(
      await within(document.body).findByRole("menuitem", {
        name: "Als Kopie speichern",
      }),
    ).toBeVisible();
  },
};
export const Discard: Story = {
  ...Settings,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Name"), " – Entwurf");
    await userEvent.click(
      canvas.getByRole("button", { name: "Änderungen verwerfen" }),
    );
    await expect(
      await within(document.body).findByRole("alertdialog"),
    ).toBeVisible();
  },
};

export const RecommendedMessage: Story = {
  ...Chat,
  args: {
    ...Chat.args,
    agents: [
      {
        ...agents[0]!,
        recommendedMessages: [
          {
            id: "summary",
            label: "Wochenüberblick",
            message: "Fasse die wichtigsten Neuigkeiten dieser Woche zusammen.",
          },
          {
            id: "tasks",
            label: "Offene Aufgaben",
            message: "Welche Aufgaben sind noch offen?",
          },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Wochenüberblick/ }),
    );
    const message = canvas.getByLabelText("Nachricht");
    await expect(message).toHaveValue(
      "Fasse die wichtigsten Neuigkeiten dieser Woche zusammen.",
    );
    await userEvent.type(message, " Nenne auch die nächsten Schritte.");
    await expect(message).toHaveValue(
      "Fasse die wichtigsten Neuigkeiten dieser Woche zusammen. Nenne auch die nächsten Schritte.",
    );
  },
};

export const StorageOptions: Story = {
  ...Storage,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("switch", { name: "Verarbeitet" }),
    ).toBeNull();
    await expect(
      canvas.queryByRole("combobox", { name: "Datei mitsenden" }),
    ).toBeNull();
    await expect(
      canvas.getByRole("button", { name: /Datei mitsenden/ }),
    ).toHaveTextContent("In den Chat kopieren");
    await userEvent.click(
      canvas.getByRole("button", { name: /Dateiereignisse/ }),
    );
    await expect(
      await canvas.findByRole("switch", { name: "Verarbeitet" }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("switch", { name: "Hochgeladen" }));
    await expect(
      canvas.getByRole("button", { name: /Dateiereignisse/ }),
    ).toHaveTextContent("Hochgeladen");
    await userEvent.click(
      canvas.getByRole("button", { name: /Datei mitsenden/ }),
    );
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Datei mitsenden" }),
    );
    await userEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole("option", {
        name: "Nicht mitsenden",
      }),
    );
    await expect(
      canvas.getByRole("button", { name: /Datei mitsenden/ }),
    ).toHaveTextContent("Nicht mitsenden");
  },
};

export const RunFromMenu: Story = {
  ...Storage,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: "Jetzt ausführen" }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Optionen" }));
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole("menuitem", { name: "Jetzt ausführen" }),
    );
    await expect(await page.findByRole("dialog")).toBeVisible();
  },
};

export const InvalidName: Story = {
  ...Settings,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.click(canvas.getByRole("button", { name: "Speichern" }));
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(
      canvas.getByText("Gib einen Namen mit 1 bis 200 Zeichen ein."),
    ).toBeVisible();
  },
};

export const InvalidChat: Story = {
  ...Chat,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const message = canvas.getByLabelText("Nachricht");
    await userEvent.clear(message);
    await userEvent.click(canvas.getByRole("button", { name: "Speichern" }));
    await expect(message).toHaveAttribute("aria-invalid", "true");
    await expect(
      canvas.getByText("Gib eine Nachricht mit 1 bis 100.000 Zeichen ein."),
    ).toBeVisible();
  },
};

export const InvalidTime: Story = {
  ...Weekly,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const time = canvas.getByLabelText("Uhrzeit");
    await userEvent.clear(time);
    await userEvent.click(canvas.getByRole("button", { name: "Speichern" }));
    await expect(time).toHaveAttribute("aria-invalid", "true");
    await expect(
      canvas.getByText("Gib eine gültige Uhrzeit ein."),
    ).toBeVisible();
  },
};
