import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconGroup } from "./icon-group.tsx";
import {
  IconGroupInfo,
  IconGroupButton,
  IconGroupButtonAction,
} from "./icon-group.tsx";
import { Info, ArrowRight } from "lucide-react";
const meta = {
  title: "UI/IconGroup",
  component: IconGroup,
  args: {
    children: (
      <>
        <IconGroupInfo tooltip="Info">
          <Info />
        </IconGroupInfo>
        <IconGroupButton tooltip="Öffnen">
          <ArrowRight />
        </IconGroupButton>
      </>
    ),
  },
} satisfies Meta<typeof IconGroup>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { children: undefined } };
export const Disabled: Story = {
  args: {
    children: (
      <IconGroupButton tooltip="Öffnen" disabled>
        <ArrowRight />
      </IconGroupButton>
    ),
  },
};
export const Pending: Story = {
  args: {
    children: (
      <IconGroupButtonAction tooltip="Speichern" isPending>
        <ArrowRight />
      </IconGroupButtonAction>
    ),
  },
};
export const Error: Story = {
  args: {
    children: (
      <IconGroupButtonAction tooltip="Speichern" hasErrored>
        <ArrowRight />
      </IconGroupButtonAction>
    ),
  },
};
export const Success: Story = {
  args: {
    children: (
      <IconGroupButtonAction tooltip="Speichern" hasSucceeded>
        <ArrowRight />
      </IconGroupButtonAction>
    ),
  },
};
