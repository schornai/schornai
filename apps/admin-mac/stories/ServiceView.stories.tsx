import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ServiceView } from "../src/renderer/components/ServiceView";
import { messages } from "./fixtures";

const meta = {
  title: "Admin/ServiceView",
  component: ServiceView,
  args: {
    status: "running",
    pending: null,
    error: "",
    messages,
    onControl: fn(async () => {}),
  },
} satisfies Meta<typeof ServiceView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("Release: Dezember Dev Build 7"),
    ).toBeVisible();
  },
};
export const Starting: Story = {
  args: { status: "starting", pending: "start" },
};
export const Stopped: Story = { args: { status: "stopped" } };
export const Error: Story = {
  args: { status: "stopped", error: "Error: ENOENT — ~/.aibox/config.json" },
};
export const Logs: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: /Protokolle anzeigen|Show logs/,
      }),
    );
    await expect(within(canvasElement).getByRole("table")).toBeVisible();
  },
};
export const NarrowLogs: Story = {
  ...Logs,
  globals: { locale: "en" },
  decorators: [
    (Story) => (
      <div style={{ width: 600 }}>
        <Story />
      </div>
    ),
  ],
};
export const Empty: Story = {
  args: { messages: [] },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: /Protokolle anzeigen|Show logs/,
      }),
    );
    await expect(
      within(canvasElement).getByText(/Noch keine Protokolle|No logs yet/),
    ).toBeVisible();
  },
};
export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Protokolle anzeigen|Show logs/ }),
    );
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "transcriber-mlx" }),
    );
    await userEvent.type(
      canvas.getByRole("textbox", {
        name: /Protokolle durchsuchen|Search logs/,
      }),
      "WEB",
    );
    await expect(
      await canvas.findByText(/Keine passenden Meldungen|No matching messages/),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: /Filter zurücksetzen|Reset filters/ }),
    );
    await expect(canvas.getByRole("textbox")).toHaveValue("");
    await expect(
      canvas.getByRole("checkbox", { name: "transcriber-mlx" }),
    ).not.toBeChecked();
    await waitFor(() =>
      expect(
        within(canvas.getByRole("table")).getAllByRole("row"),
      ).toHaveLength(5),
    );
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "transcriber-mlx" }),
    );
    await expect(
      within(canvas.getByRole("table")).getAllByRole("row"),
    ).toHaveLength(2);
  },
};
export const Search: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Protokolle anzeigen|Show logs/ }),
    );
    // The typo matches a word at the end of a multiline log, beyond Fuse's
    // default location window. The sender contains none of this search term.
    await userEvent.type(
      canvas.getByRole("textbox", {
        name: /Protokolle durchsuchen|Search logs/,
      }),
      "artifcat",
    );
    await waitFor(() =>
      expect(
        within(canvas.getByRole("table")).getAllByRole("row"),
      ).toHaveLength(2),
    );
    await expect(
      within(canvas.getByRole("table")).getByText(
        /Waiting for a matching artifact/,
      ),
    ).toBeVisible();
  },
};
