import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ResourceSlot } from "../../app/_components/ResourceSlot";
import {
  agents,
  repositories,
  transcribers,
} from "../(main)/app/automation/fixtures";
const meta = {
  title: "Web/shared/ResourceSlot",
  component: ResourceSlot,
  args: {
    type: "agent",
    resources: agents,
    onChange: () => {},
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <ResourceSlot {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof ResourceSlot>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Agent: Story = { args: { value: agents[0]!.id } };
export const Repository: Story = {
  args: {
    type: "documentRepository",
    resources: repositories,
    value: repositories[0]!.id,
  },
};
export const Transcriber: Story = {
  args: {
    type: "transcriber",
    resources: transcribers,
    value: transcribers[0]!.id,
  },
};
export const EmptyRepository: Story = {
  args: { type: "documentRepository", resources: repositories },
};
export const EmptyTranscriber: Story = {
  args: { type: "transcriber", resources: transcribers },
};
export const Unavailable: Story = { args: { value: "missing" } };
export const Disabled: Story = { args: { disabled: true } };
export const Dialog: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: /Agent auswählen/ }),
    );
    await expect(within(document.body).getByRole("dialog")).toBeVisible();
  },
};
export const SelectAndClear: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Agent auswählen/ }),
    );
    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.type(dialog.getByRole("textbox"), "Wochen");
    await userEvent.click(
      dialog.getByRole("button", { name: "Wochenbriefing auswählen" }),
    );
    await expect(canvas.getByText("Wochenbriefing")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Agent entfernen" }),
    );
    await expect(
      canvas.getByRole("button", { name: /Agent auswählen/ }),
    ).toBeVisible();
  },
};
