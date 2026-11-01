import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SidebarFavorites } from "../../../app/(main)/_components/SidebarFavorites";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/SidebarFavorites",
  component: SidebarFavorites,
  args: {},
  async play({ canvas }) {
    await expect(await canvas.findByRole("list")).toBeVisible();
  },
} satisfies Meta<typeof SidebarFavorites>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { scenario: "empty" } };

export const Transcriber: Story = {
  parameters: {
    serviceFixtures: {
      getCurrentUserConfigFavorites: {
        favorites: [
          { id: "11111111-1111-4111-8111-111111111111", type: "transcriber" },
        ],
      },
    },
  },
};

export const DocumentRepository: Story = {
  parameters: {
    serviceFixtures: {
      getCurrentUserConfigFavorites: {
        favorites: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            type: "documentRepository",
          },
        ],
      },
    },
  },
};
