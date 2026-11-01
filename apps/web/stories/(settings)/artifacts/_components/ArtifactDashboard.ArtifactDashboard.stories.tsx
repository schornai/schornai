import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArtifactDashboard } from "../../../../app/(settings)/artifacts/_components/ArtifactDashboard";
import { serviceArtifacts } from "../../service/fixtures";
const meta = {
  title: "Web/(settings)/artifacts/ArtifactDashboard",
  component: ArtifactDashboard,
  parameters: { nextjs: { navigation: { pathname: "/artifacts", query: {} } } },
  args: {
    artifacts: serviceArtifacts,
  },
} satisfies Meta<typeof ArtifactDashboard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const PlatformSetups: Story = {
  args: {
    artifacts: [
      {
        ...serviceArtifacts[0]!,
        name: "setup-macos-arm64.xrag.tar",
        xrag: {
          xrag_version: 1,
          xrag_type: "setup",
          platform: "darwin",
          arch: "arm64",
        },
      },
      {
        ...serviceArtifacts[0]!,
        id: "d".repeat(64),
        name: "setup-linux-x64.xrag.tar",
        createdAt: "2026-10-24T13:30:00Z",
        xrag: {
          xrag_version: 1,
          xrag_type: "setup",
          platform: "linux",
          arch: "x64",
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getAllByText("Aktuelles Setup"),
    ).toHaveLength(2);
  },
};
export const Empty: Story = { args: { artifacts: [] } };
export const Disconnected: Story = { args: { connected: false } };
export const CleanupPending: Story = {
  args: {
    artifacts: [{ ...serviceArtifacts[0]!, deletedAt: "2026-10-24T13:55:00Z" }],
  },
};
const openDelete: NonNullable<Story["play"]> = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.click(
    canvas.getAllByRole("button", { name: /schornai-setup/i })[0]!,
  );
  await expect(
    within(canvasElement.ownerDocument.body).getByRole("alertdialog"),
  ).toBeVisible();
};
export const DeleteConfirmation: Story = { play: openDelete };
export const DeleteError: Story = {
  parameters: { scenario: "error" },
  play: openDelete,
};
export const DeletePending: Story = {
  parameters: { scenario: "pending" },
  play: openDelete,
};

export const Attachments: Story = {
  parameters: { nextjs: { navigation: { query: { view: "tiles" } } } },
};
export const GroupedAttachments: Story = {
  parameters: {
    nextjs: {
      navigation: {
        query: { view: "tiles", group: "target", sort: "size:desc" },
      },
    },
  },
};
export const GroupedTable: Story = {
  parameters: { nextjs: { navigation: { query: { group: "type" } } } },
};
export const AttachmentDeleteConfirmation: Story = {
  ...Attachments,
  play: openDelete,
};
export const Options: Story = {
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole("button", { name: "Optionen" }).focus();
    await userEvent.keyboard("[ArrowDown]");
    const body = within(canvasElement.ownerDocument.body);
    await body.findByRole("menu");
    body.getByRole("menuitem", { name: "Ansicht" }).focus();
    await userEvent.keyboard("[ArrowRight]");
    await expect(
      await body.findByRole("menuitemradio", { name: "Kacheln" }),
    ).toBeVisible();
  },
};
