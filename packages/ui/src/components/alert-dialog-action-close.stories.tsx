import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertDialogActionClose } from "./alert-dialog-action-close.tsx";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "./alert-dialog.tsx";
const meta = {
  title: "UI/AlertDialogActionClose",
  component: AlertDialogActionClose,
  args: { children: "Schließen" },
  decorators: [
    (Story) => (
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestätigung</AlertDialogTitle>
            <AlertDialogDescription>Aktion bestätigen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Story />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
  ],
} satisfies Meta<typeof AlertDialogActionClose>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Destructive: Story = { args: { variant: "destructive" } };
