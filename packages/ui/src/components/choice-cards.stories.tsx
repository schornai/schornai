import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarDays, Clock } from "lucide-react";
import { ChoiceCards } from "./choice-cards";
const meta = {
  title: "Components/ChoiceCards",
  component: ChoiceCards,
  args: {
    label: "Zeitplan",
    value: "hours",
    onValueChange: () => {},
    options: [
      { value: "hours", label: "Stündlich", icon: Clock },
      { value: "days", label: "Täglich", icon: CalendarDays },
    ],
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <ChoiceCards {...args} value={value} onValueChange={setValue} />;
  },
} satisfies Meta<typeof ChoiceCards>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };

export const Segments: Story = { args: { variant: "segments" } };
