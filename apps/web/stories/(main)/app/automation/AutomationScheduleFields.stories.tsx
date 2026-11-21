import { userEvent, within, expect } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AutomationScheduleFields } from "../../../../app/(main)/app/automation/_components/AutomationScheduleFields";

const meta = {
  title: "Web/(main)/app/automation/AutomationScheduleFields",
  component: AutomationScheduleFields,
  args: {
    schedule: {
      kind: "weekly",
      weekdays: [1, 2, 3, 4, 5, 6, 0],
      time: "09:00",
      timezone: "Europe/Vienna",
    },
    onChange: () => {},
  },
} satisfies Meta<typeof AutomationScheduleFields>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Weekdays: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /Jeden Tag/ }),
    );
    await expect(
      await within(canvasElement).findByRole("switch", { name: "Montag" }),
    ).toBeVisible();
  },
};
export const Interval: Story = {
  args: { schedule: { kind: "hours", every: 3 } },
};

export const Timezone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("textbox", { name: "Zeitzone" }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: /Zeitzone: Europe/ }),
    );
    await expect(
      await canvas.findByRole("textbox", { name: "Zeitzone" }),
    ).toBeVisible();
  },
};

export const StoredDayInterval: Story = {
  args: { schedule: { kind: "days", every: 3 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("spinbutton")).toHaveValue(72);
    await expect(
      within(canvasElement).queryByRole("button", { name: "Tage" }),
    ).toBeNull();
  },
};

export const SavedNextRun: Story = {
  args: {
    schedule: { kind: "hours", every: 3 },
    nextRunAt: "2026-01-15T16:00:00Z",
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("time")).toHaveAttribute(
      "datetime",
      "2026-01-15T16:00:00.000Z",
    );
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "15.01.2026, 17:00",
    );
  },
};
export const Paused: Story = { args: { enabled: false } };
export const Incomplete: Story = {
  args: {
    schedule: {
      kind: "weekly",
      weekdays: [],
      time: "09:00",
      timezone: "Europe/Vienna",
    },
  },
};
export const Past: Story = {
  args: { schedule: { kind: "once", at: "2025-01-01T10:00:00Z" } },
};
