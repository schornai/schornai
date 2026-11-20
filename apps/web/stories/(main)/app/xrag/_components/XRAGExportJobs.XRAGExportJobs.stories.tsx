import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGExportJobs } from "../../../../../app/(main)/app/xrag/_components/XRAGExportJobs";
const base = {
  id: "11111111-1111-4111-8111-111111111111",
  package_id: null,
  name: "workspace.xrag.tar",
  attempts: 0,
  bytes_uploaded: 0,
  total_bytes: null,
  created_at: "2026-11-16T00:00:00Z",
  updated_at: "2026-11-16T00:00:00Z",
};
const meta = {
  title: "Web/(main)/app/xrag/XRAGExportJobs",
  component: XRAGExportJobs,
  args: { jobs: [{ ...base, state: "queued" }] },
} satisfies Meta<typeof XRAGExportJobs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Queued: Story = {};
export const Retrying: Story = {
  args: { jobs: [{ ...base, state: "queued", attempts: 1 }] },
};
export const Packaging: Story = {
  args: { jobs: [{ ...base, state: "processing" }] },
};
export const Uploading: Story = {
  args: {
    jobs: [
      {
        ...base,
        state: "processing",
        total_bytes: 120 * 1024 ** 3,
        bytes_uploaded: 60 * 1024 ** 3,
      },
    ],
  },
};
export const Finished: Story = {
  args: {
    jobs: [{ ...base, state: "finished", total_bytes: 120 * 1024 ** 3 }],
  },
};
export const Failed: Story = { args: { jobs: [{ ...base, state: "error" }] } };
export const Cancelled: Story = {
  args: { jobs: [{ ...base, state: "cancelled" }] },
};

export const ConfirmDelete: Story = {
  ...Finished,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Export löschen" }),
    );
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("alertdialog"),
    ).toBeVisible();
  },
};
