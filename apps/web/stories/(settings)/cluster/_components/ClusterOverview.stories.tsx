import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ClusterOverview } from "../../../../app/(settings)/cluster/_components/ClusterOverview";

const meta = {
  tags: ["async-component"],
  title: "Web/(settings)/cluster/ClusterOverview",
  component: ClusterOverview,
  parameters: { serviceFixtures: { getWorkspaceClaims: { isAdmin: true } } },
} satisfies Meta<typeof ClusterOverview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Cluster" }),
    ).toBeVisible();
    for (const [name, href] of [
      ["Service", "/service"],
      ["Aufgabenstapel", "/tasks"],
      ["Artefakte", "/artifacts"],
    ]) {
      await expect(canvas.getByRole("link", { name })).toHaveAttribute(
        "href",
        href,
      );
    }
  },
};

export const NonAdmin: Story = {
  parameters: { serviceFixtures: { getWorkspaceClaims: { isAdmin: false } } },
  play: async ({ canvas }) => {
    await canvas.findByRole("heading", { name: "Cluster" });
    await expect(
      canvas.queryByRole("link", { name: "Service" }),
    ).not.toBeInTheDocument();
  },
};
