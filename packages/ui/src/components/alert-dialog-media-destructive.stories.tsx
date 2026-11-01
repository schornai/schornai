import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertDialogMediaDestructive } from "./alert-dialog-media-destructive.tsx";
import { Trash2, XCircle } from "lucide-react";
const meta = {
  title: "UI/AlertDialogMediaDestructive",
  component: AlertDialogMediaDestructive,
  args: { children: <Trash2 /> },
} satisfies Meta<typeof AlertDialogMediaDestructive>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const CustomIcon: Story = { args: { children: <XCircle /> } };
export const Empty: Story = { args: { children: undefined } };
