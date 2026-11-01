import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { SAMLMetadataDownload } from "../../../../../app/(settings)/settings/sso/_components/SAMLMetadataDownload";
const meta = {
  title: "Web/(settings)/settings/sso/SAMLMetadataDownload",
  component: SAMLMetadataDownload,
} satisfies Meta<typeof SAMLMetadataDownload>;
export default meta;
type Story = StoryObj<typeof meta>;
const download: Story["play"] = async ({ canvasElement }) => {
  await userEvent.click(
    within(canvasElement).getByRole("button", { name: /XML/ }),
  );
};
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = {
  parameters: { scenario: "error" },
  play: download,
};
export const NotConfigured: Story = {
  parameters: { serviceFixtures: { actionResult: { configured: false } } },
  play: download,
};
