import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { FileUploadProvider } from "../../app/_components/FileUploadProvider";

const meta = {
  title: "Web/FileUploadProvider",
  component: FileUploadProvider,
  args: {
    afterUpload: fn(),
    basePath: "/",
    beforeUpload: fn(),
    bucketName: "Beispiel",
    bucketPath: "/",
    children: "Beispielinhalt",
    onFileUploadError: fn(),
    onFileUploadProgress: fn(),
    onFileUploadSuccess: fn(),
    restrictUpload: fn(),
  },
} satisfies Meta<typeof FileUploadProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AfterUpload_missing: Story = { args: { afterUpload: undefined } };
export const BeforeUpload_missing: Story = {
  args: { beforeUpload: undefined },
};
export const OnFileUploadError_missing: Story = {
  args: { onFileUploadError: undefined },
};
export const OnFileUploadProgress_missing: Story = {
  args: { onFileUploadProgress: undefined },
};
export const OnFileUploadSuccess_missing: Story = {
  args: { onFileUploadSuccess: undefined },
};
export const RestrictUpload_missing: Story = {
  args: { restrictUpload: undefined },
};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
