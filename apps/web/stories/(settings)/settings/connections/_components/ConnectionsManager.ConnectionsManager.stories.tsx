import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { ConnectionsManager } from "../../../../../app/(settings)/settings/connections/_components/ConnectionsManager";
const meta = {
  title: "Web/(settings)/settings/connections/ConnectionsManager",
  component: ConnectionsManager,
  args: {
    initialConnections: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Websuche",
        kind: "brave",
        client_id: null,
        market: null,
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "GitHub",
        kind: "oauth",
        client_id: "example-client",
        market: null,
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        name: "Staan",
        kind: "staan",
        client_id: null,
        market: "de-de",
      },
    ],
  },
} satisfies Meta<typeof ConnectionsManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { initialConnections: [] } };
export const GroupedByKind: Story = {
  args: { userPreferences: { group: "kind", sort: "name:asc", view: "table" } },
};
export const GroupedByLetter: Story = {
  args: {
    userPreferences: {
      group: "first-letter",
      sort: "name:desc",
      view: "table",
    },
  },
};
export const Options: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Optionen" }),
    );
  },
};
export const Delete: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getAllByRole("button", { name: "Löschen" })[0]!,
    );
  },
};
export const NoResults: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(
      within(canvasElement).getByRole("textbox", {
        name: "Verbindungen durchsuchen",
      }),
      "xyz-no-match",
    );
  },
};
