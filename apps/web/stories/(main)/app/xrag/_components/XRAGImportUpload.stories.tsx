import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { XRAGImportUpload } from "../../../../../app/(main)/app/xrag/_components/XRAGImportUpload";
const meta = {
  title: "Web/(main)/app/xrag/XRAGImportUpload",
  component: XRAGImportUpload,
  parameters: { contextFixtures: { useFileUpload: { uploads: [] } } },
  args: { userId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof XRAGImportUpload>;
export default meta;
export const Default: StoryObj<typeof meta> = {};

const file = { name: "Buchhaltung.xrag.tar" };
export const Uploading: StoryObj<typeof meta> = {
  parameters: {
    contextFixtures: {
      useFileUpload: { uploads: [{ file, state: "uploading", progress: 0.5 }] },
    },
  },
};
export const Preparing: StoryObj<typeof meta> = {
  parameters: {
    scenario: "pending",
    contextFixtures: {
      useFileUpload: { uploads: [{ file, state: "success", progress: 1 }] },
    },
  },
};
