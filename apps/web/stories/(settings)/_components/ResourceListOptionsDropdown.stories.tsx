import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, expect, userEvent, within } from "storybook/test";
import { ResourceListOptionsDropdown } from "../../../app/(settings)/_components/ResourceListOptionsDropdown";
const meta = {
  title: "Web/(settings)/ResourceListOptionsDropdown",
  component: ResourceListOptionsDropdown,
  args: {
    list: {
      group: "state",
      sort: "name:asc",
      view: "table",
      setGroup: fn(),
      setSort: fn(),
      setView: fn(),
      isUserPreferences: false,
      savePreferences: fn(),
      resetPreferences: fn(),
      savePreferencesIsPending: false,
      savePreferencesHasErrored: false,
      savePreferencesHasSucceeded: false,
    },
    groups: [
      { value: "no-group", label: "Keine Gruppierung" },
      { value: "state", label: "Status" },
    ],
    sorts: [
      { value: "name:asc", label: "Name (A–Z)" },
      { value: "name:desc", label: "Name (Z–A)" },
    ],
    views: [
      { value: "cards", label: "Kacheln" },
      { value: "table", label: "Tabelle" },
    ],
  },
} satisfies Meta<typeof ResourceListOptionsDropdown>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    within(canvasElement).getByRole("button", { name: "Optionen" }).focus();
    await userEvent.keyboard("[ArrowDown]");
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole("menu"),
    ).toBeVisible();
  },
};
