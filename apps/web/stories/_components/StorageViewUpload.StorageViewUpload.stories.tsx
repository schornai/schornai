import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StorageViewUpload } from "../../app/_components/StorageViewUpload";

const meta = {
  title: "Web/StorageViewUpload",
  component: StorageViewUpload,
  args: {},
} satisfies Meta<typeof StorageViewUpload>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const UploadQueued: Story = {
  parameters: {
    contextFixtures: {
      useFileUpload: {
        progress: 0,
        uploads: [
          {
            id: "upload-1",
            state: "queued",
            path: "/example.txt",
            errorMessage: "Upload fehlgeschlagen",
          },
        ],
      },
    },
  },
};
export const UploadUploading: Story = {
  parameters: {
    contextFixtures: {
      useFileUpload: {
        progress: 0.45,
        uploads: [
          {
            id: "upload-1",
            state: "uploading",
            path: "/example.txt",
            errorMessage: "Upload fehlgeschlagen",
          },
        ],
      },
    },
  },
};
export const UploadError: Story = {
  parameters: {
    contextFixtures: {
      useFileUpload: {
        progress: 0.45,
        uploads: [
          {
            id: "upload-1",
            state: "error",
            path: "/example.txt",
            errorMessage: "Upload fehlgeschlagen",
          },
        ],
      },
    },
  },
};
export const UploadSuccess: Story = {
  parameters: {
    contextFixtures: {
      useFileUpload: {
        progress: 1,
        uploads: [
          {
            id: "upload-1",
            state: "success",
            path: "/example.txt",
            errorMessage: "Upload fehlgeschlagen",
          },
        ],
      },
    },
  },
};
