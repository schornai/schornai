import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StatusBadge } from "../../app/_components/StatusBadge";
const meta = {
  title: "Web/Shared/StatusBadge",
  component: StatusBadge,
  args: { state: "idle", children: "Wartet" },
} satisfies Meta<typeof StatusBadge>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
