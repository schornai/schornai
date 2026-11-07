import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlatformMcpConsent } from "../../../../app/oauth/authorize/_components/PlatformMcpConsent";
const meta = {
  title: "Web/oauth/authorize/PlatformMcpConsent",
  component: PlatformMcpConsent,
  args: {
    clientName: "Externer Assistent",
    request: {
      client_id: "11111111-1111-4111-8111-111111111111",
      redirect_uri: "https://client.example/callback",
      response_type: "code",
      code_challenge_method: "S256",
      code_challenge: "a".repeat(43),
      resource: "https://schorn.example/mcp/editor",
      scope: "editor",
      state: "example",
    },
  },
} satisfies Meta<typeof PlatformMcpConsent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Pending: Story = { parameters: { scenario: "pending" } };
export const Error: Story = { parameters: { scenario: "error" } };
