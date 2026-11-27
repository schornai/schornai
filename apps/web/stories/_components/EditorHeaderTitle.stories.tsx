import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BotMessageSquare, Ellipsis, Pencil } from "lucide-react";
import { expect } from "storybook/test";
import { Button } from "@schornio/aibox-package-ui/components/button";
import {
  HeaderMain,
  HeaderMainAsideContent,
} from "@schornio/aibox-package-ui/components/header-main";
import { EditorHeaderTitle } from "../../app/_components/EditorHeaderTitle";

const meta = {
  title: "Web/EditorHeaderTitle",
  component: EditorHeaderTitle,
  decorators: [
    (Story) => (
      <div className="w-[393px] max-w-full">
        <HeaderMain>
          <Story />
          <HeaderMainAsideContent>
            <Button size="icon-sm" variant="ghost" aria-label="Optionen">
              <Ellipsis />
            </Button>
          </HeaderMainAsideContent>
        </HeaderMain>
      </div>
    ),
  ],
  args: {
    icon: <BotMessageSquare />,
    title: "Agent",
    name: "Suchmaschine",
    children: (
      <Button size="icon-xs" variant="ghost" aria-label="Änderungen verwerfen">
        <Pencil />
      </Button>
    ),
  },
} satisfies Meta<typeof EditorHeaderTitle>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Mobile: Story = {
  play: async ({ canvas }) => {
    const title = canvas.getByRole("heading");
    const header = title.parentElement!.getBoundingClientRect();
    for (const element of title.children) {
      const bounds = element.getBoundingClientRect();
      await expect(bounds.top).toBeGreaterThanOrEqual(header.top);
      await expect(bounds.bottom).toBeLessThanOrEqual(header.bottom);
      await expect(bounds.left).toBeGreaterThanOrEqual(header.left);
      await expect(bounds.right).toBeLessThanOrEqual(header.right);
    }
  },
};
export const LongName: Story = {
  ...Mobile,
  args: {
    name: "Suchmaschine für ausführliche Rechercheberichte mit Quellenangaben",
  },
};
