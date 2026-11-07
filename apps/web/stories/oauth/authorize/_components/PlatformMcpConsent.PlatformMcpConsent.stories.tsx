import { expect, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PlatformMcpConsent } from "../../../../app/oauth/authorize/_components/PlatformMcpConsent";
const meta = {
  title: "Web/oauth/authorize/PlatformMcpConsent",
  component: PlatformMcpConsent,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="flex min-h-svh flex-col">
        <Story />
      </div>
    ),
  ],
  args: {
    clientName: "Externer Assistent",
    levels: ["user", "editor", "workspace", "admin"],
    request: {
      client_id: "11111111-1111-4111-8111-111111111111",
      redirect_uri: "https://client.example/callback",
      response_type: "code",
      code_challenge_method: "S256",
      code_challenge: "a".repeat(43),
      resource: "https://schorn.example/mcp",
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

export const Workspace: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const select = canvas.getByRole("combobox", { name: "Zugriffsstufe" });
    await userEvent.click(select);
    expect(
      body.queryByRole("option", { name: "Globaler Administrator" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      await body.findByRole("option", { name: "Workspace-Administrator" }),
    );
    await expect(select).toHaveTextContent("Workspace-Administrator");
  },
  args: {
    clientName: "schorn.ai",
    levels: ["user", "editor", "workspace"],
    request: {
      ...meta.args.request,
      scope: "workspace",
      resource: "https://schorn.example/mcp",
      redirect_uri: "https://localhost:3000/api/mcp/oauth/callback",
    },
  },
};
export const LongAddresses: Story = {
  args: {
    clientName: "Externer Assistent für Dokumentation und Projektverwaltung",
    request: {
      ...meta.args.request,
      resource: "https://schorn.example/" + "long-path/".repeat(12) + "mcp",
      redirect_uri: "https://client.example/" + "callback/".repeat(12),
    },
  },
};

export const UserOnly: Story = { args: { levels: ["user"] } };
export const NoAccess: Story = { args: { levels: [] } };
