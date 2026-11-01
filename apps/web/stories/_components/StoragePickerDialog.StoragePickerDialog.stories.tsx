import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { StoragePickerDialog } from "../../app/_components/StoragePickerDialog";
const meta = {
  title: "Web/StoragePickerDialog",
  component: StoragePickerDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    mode: "folder",
    onSelect: fn(async () => {}),
    currentStorage: {
      type: "activity",
      agentId: "agent",
      activityId: "activity",
    },
  },
} satisfies Meta<typeof StoragePickerDialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await within(canvasElement.ownerDocument.body).findByRole("button", {
      name: "Projekte",
    });
  },
};
export const FileSelection: Story = {
  args: { mode: "file" },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole("button", { name: "notes.txt" }),
    );
  },
};
export const NestedFolder: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole("button", { name: "Projekte" }),
    );
    await expect(body.findByText("/Projekte")).resolves.toBeTruthy();
  },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Error: Story = {
  parameters: { scenario: "error" },
  play: async ({ canvasElement }) => {
    await within(canvasElement.ownerDocument.body).findByRole("alert");
  },
};
export const Collision: Story = {
  args: {
    onSelect: fn(async () => {
      throw new globalThis.Error("FILE_ALREADY_EXISTS");
    }),
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("button", { name: "Projekte" });
    await userEvent.click(
      body.getByRole("button", { name: /Diesen Ordner|Use this folder/ }),
    );
    await body.findByRole("alert");
  },
};
