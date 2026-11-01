import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeaderMain } from "./header-main.tsx";
import { HeaderMainContent, HeaderMainAsideContent } from "./header-main.tsx";
import { Star, SlidersHorizontal } from "lucide-react";
import { Button } from "./button.tsx";
const meta = {
  title: "UI/HeaderMain",
  component: HeaderMain,
  args: {
    children: (
      <>
        <HeaderMainContent>Überschrift</HeaderMainContent>
        <HeaderMainAsideContent>
          <Button>Aktion</Button>
        </HeaderMainAsideContent>
      </>
    ),
  },
} satisfies Meta<typeof HeaderMain>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Fit: Story = { args: { fit: true } };
export const Long: Story = {
  args: {
    children: (
      <HeaderMainContent>
        Eine lange Überschrift mit vielen Wörtern
      </HeaderMainContent>
    ),
  },
};
export const Empty: Story = { args: { children: undefined } };

export const MobileGreeting: Story = {
  decorators: [
    (Story) => (
      <div className="w-80 max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <HeaderMainContent>
        <Star />
        Guten Abend, Thomas
      </HeaderMainContent>
    ),
  },
};
export const MobileLongTitleWithActions: Story = {
  decorators: [
    (Story) => (
      <div className="w-80 max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <HeaderMainContent>
          <Star />
          Eine sehr lange Überschrift mit vielen Wörtern
        </HeaderMainContent>
        <HeaderMainAsideContent>
          <Button variant="ghost" size="icon" aria-label="Optionen">
            <SlidersHorizontal />
          </Button>
        </HeaderMainAsideContent>
      </>
    ),
  },
};
