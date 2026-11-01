import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AlreadySignedIn } from "../../../app/signin/_components/AlreadySignedIn";

const meta = {
  tags: ["async-component"],
  title: "Web/signin/AlreadySignedIn",
  component: AlreadySignedIn,
  args: {
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "alex@example.test",
      firstName: "Alex",
      lastName: "Beispiel",
      name: "Beispiel",
      signInMethod: "email",
      lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
    },
  },
} satisfies Meta<typeof AlreadySignedIn>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const User_signInMethod_email: Story = { args: {} };
export const User_signInMethod_sso: Story = {
  args: {
    user: {
      id: "11111111-1111-4111-8111-111111111111",
      email: "alex@example.test",
      firstName: "Alex",
      lastName: "Beispiel",
      name: "Beispiel",
      signInMethod: "sso",
      lastSignInAt: new Date("2026-01-15T12:00:00.000Z"),
    },
  },
};

export const Empty: Story = { parameters: { scenario: "empty" } };
