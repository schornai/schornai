import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ConnectionTypeSelection } from "../../../../../app/(settings)/settings/connections/_components/ConnectionTypeSelection";
const meta = {
  title: "Web/(settings)/settings/connections/ConnectionTypeSelection",
  component: ConnectionTypeSelection,
} satisfies Meta<typeof ConnectionTypeSelection>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
