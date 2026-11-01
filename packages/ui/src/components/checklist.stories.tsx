import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checklist } from "./checklist.tsx";
import {
  ChecklistItem,
  ChecklistItemIndicator,
  ChecklistItemHeader,
  ChecklistItemContent,
} from "./checklist.tsx";
const meta = {
  title: "UI/Checklist",
  component: Checklist,
  args: {},
} satisfies Meta<typeof Checklist>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Success: Story = {
  args: {
    children: (
      <ChecklistItem>
        <ChecklistItemIndicator variant="success" />
        <ChecklistItemHeader>Erledigt</ChecklistItemHeader>
        <ChecklistItemContent>Beschreibung</ChecklistItemContent>
      </ChecklistItem>
    ),
  },
};
export const Error: Story = {
  args: {
    children: (
      <ChecklistItem>
        <ChecklistItemIndicator variant="error" />
        <ChecklistItemHeader>Fehler</ChecklistItemHeader>
        <ChecklistItemContent>Bitte erneut versuchen</ChecklistItemContent>
      </ChecklistItem>
    ),
  },
};
export const Neutral: Story = {
  args: {
    children: (
      <ChecklistItem>
        <ChecklistItemIndicator />
        <ChecklistItemHeader>Ausstehend</ChecklistItemHeader>
        <ChecklistItemContent>Beschreibung</ChecklistItemContent>
      </ChecklistItem>
    ),
  },
};
export const Long: Story = {
  args: {
    children: (
      <ChecklistItem>
        <ChecklistItemIndicator />
        <ChecklistItemHeader>{"Langer Titel ".repeat(20)}</ChecklistItemHeader>
        <ChecklistItemContent>
          {"Beschreibung ".repeat(30)}
        </ChecklistItemContent>
      </ChecklistItem>
    ),
  },
};
