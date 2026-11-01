import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ServiceDashboard } from "../../../../app/(settings)/service/_components/ServiceDashboard";
import { serviceMachines, serviceNow } from "../fixtures";
const meta = {
  title: "Web/(settings)/service/ServiceDashboard",
  component: ServiceDashboard,
  args: { machines: serviceMachines, now: serviceNow },
  parameters: { nextjs: { navigation: { pathname: "/service", query: {} } } },
} satisfies Meta<typeof ServiceDashboard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { machines: [] } };
export const Disconnected: Story = { args: { connected: false } };
export const Table: Story = {
  parameters: { nextjs: { navigation: { query: { view: "table" } } } },
};
export const GroupedCards: Story = {
  parameters: { nextjs: { navigation: { query: { group: "state" } } } },
};
export const GroupedTable: Story = {
  parameters: {
    nextjs: {
      navigation: { query: { view: "table", group: "role", sort: "cpu:desc" } },
    },
  },
};
