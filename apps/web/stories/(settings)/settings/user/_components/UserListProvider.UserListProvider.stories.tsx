import { repeatFixtures } from "../../../../../.storybook/repeat-fixtures";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UserListProvider } from "../../../../../app/(settings)/settings/user/_components/UserListProvider";

const meta = {
  title: "Web/(settings)/settings/user/UserListProvider",
  component: UserListProvider,
  args: {
    users: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        email: "alex@example.test",
        firstName: "Alex",
        lastName: "Beispiel",
        name: "Beispiel",
        signInMethod: "email",
        lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
      },
    ],
    children: "Beispielinhalt",
    id: "11111111-1111-4111-8111-111111111111",
    userPreferences: { group: "no-group", sort: "name:asc", view: "table" },
  },
} satisfies Meta<typeof UserListProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { parameters: { scenario: "empty" } };
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
export const Success: Story = { parameters: { scenario: "success" } };
export const UsersEmpty: Story = { args: { users: [] } };
export const UsersMultiple: Story = {
  args: { users: repeatFixtures(meta.args["users"]) },
};
