import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AddExternalModel } from "../../../../app/(settings)/models/_components/AddExternalModel";
const meta = {
  title: "Web/(settings)/models/AddExternalModel",
  component: AddExternalModel,
} satisfies Meta<typeof AddExternalModel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
