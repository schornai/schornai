import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SelectableResourceCard } from "../../app/_components/SelectableResourceCard";
import {
  CardApp,
  CardAppMain,
  CardAppName,
} from "@schornio/aibox-package-ui/components/card-app";

const meta = {
  title: "Web/shared/SelectableResourceCard",
  component: SelectableResourceCard,
  args: {
    name: "Support",
    selected: true,
    onSelect: () => {},
    children: (
      <CardApp appColor={{ type: "color-oklch-hue", oklchHue: 150 }}>
        <CardAppMain>
          <CardAppName>Support</CardAppName>
        </CardAppMain>
      </CardApp>
    ),
  },
  render: function Render(args) {
    const [selected, setSelected] = useState(args.selected);
    return (
      <SelectableResourceCard
        {...args}
        selected={selected}
        onSelect={() => setSelected(!selected)}
      />
    );
  },
} satisfies Meta<typeof SelectableResourceCard>;
export default meta;
export const Selected: StoryObj<typeof meta> = {};
