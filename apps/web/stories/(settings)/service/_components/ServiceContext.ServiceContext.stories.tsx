import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceContext } from "../../../../app/(settings)/service/_components/ServiceContext";
const meta = {
  title: "Web/(settings)/service/ServiceContext",
  component: ServiceContext,
} satisfies Meta<typeof ServiceContext>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
