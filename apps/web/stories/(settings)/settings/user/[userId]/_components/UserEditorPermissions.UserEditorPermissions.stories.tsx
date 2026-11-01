import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserEditorPermissions } from "../../../../../../app/(settings)/settings/user/[userId]/_components/UserEditorPermissions";

const meta = {
  tags: ["async-component"],
  title: "Web/(settings)/settings/user/[userId]/UserEditorPermissions",
  component: UserEditorPermissions,
  args: { userId: "11111111-1111-4111-8111-111111111111" },
} satisfies Meta<typeof UserEditorPermissions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Admin: Story = {
  parameters: { serviceFixtures: { getUserIsAdmin: true } },
};

export const Empty: Story = { parameters: { scenario: "empty" } };
