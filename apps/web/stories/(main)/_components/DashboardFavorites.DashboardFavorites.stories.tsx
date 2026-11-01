import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DashboardFavorites from "../../../app/(main)/_components/DashboardFavorites";

const meta = {
  tags: ["async-component"],
  title: "Web/(main)/DashboardFavorites",
  component: DashboardFavorites,
  args: {},
} satisfies Meta<typeof DashboardFavorites>;
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
