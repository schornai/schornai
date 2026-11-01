import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProviderSelection } from "../../../../app/(settings)/models/_components/ProviderSelection";
const meta = {
  title: "Web/(settings)/models/ProviderSelection",
  component: ProviderSelection,
} satisfies Meta<typeof ProviderSelection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
