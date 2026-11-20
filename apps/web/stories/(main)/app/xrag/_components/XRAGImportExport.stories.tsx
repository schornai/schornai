import { expect, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGImportExport } from "../../../../../app/(main)/app/xrag/_components/XRAGImportExport";
import { XRAGImportUpload } from "../../../../../app/(main)/app/xrag/_components/XRAGImportUpload";
import { XRAGPackages } from "../../../../../app/(main)/app/xrag/_components/XRAGPackages";
const meta = {
  title: "Web/(main)/app/xrag/XRAGImportExport",
  component: XRAGImportExport,
  parameters: { contextFixtures: { useFileUpload: { uploads: [] } } },
  args: {
    tab: "import",
    children: <XRAGImportUpload userId="user" />,
  },
} satisfies Meta<typeof XRAGImportExport>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Upload: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("XRAG importieren")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Optionen" }),
    ).not.toBeInTheDocument();
  },
};
export const Export: Story = {
  args: { tab: "export", children: <XRAGPackages packages={[]} /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("link", { name: "Export" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(canvas.getByRole("link", { name: "Import" })).toHaveAttribute(
      "href",
      "/app/xrag/import",
    );
    await expect(
      canvas.queryByRole("button", { name: "Optionen" }),
    ).not.toBeInTheDocument();
  },
};
