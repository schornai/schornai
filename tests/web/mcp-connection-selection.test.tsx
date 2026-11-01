// @vitest-environment jsdom
import "./client-setup";
import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentConnectionSelect } from "../../apps/web/app/(main)/agent/_components/AgentConnectionSelect";
import { AgentEditorRoleMCPs } from "../../apps/web/app/(main)/agent/_components/AgentEditorRoleMCPs";
const mocks = vi.hoisted(() => ({
  update: undefined as any,
}));
vi.mock("../../apps/web/app/(main)/agent/_components/AgentEditor", () => ({
  useAgentEditor: () => ({
    relations: { connections: [connection] },
    defaultAgent: { roles: [] },
    hasValidationError: () => false,
    setAgentRole: (_id: string, update: any) => mocks.update(update),
  }),
}));
const connection = {
  id: "github",
  name: "GitHub",
  kind: "oauth" as const,
  server_url: "https://api.githubcopilot.com/mcp/",
  client_id: "client",
  market: null,
};
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);
function Editor() {
  const [role, setRole] = useState({
    id: "role",
    mcps: [
      {
        id: "mcp",
        type: "http" as const,
        url: "https://mcp.test/v1",
        headers: {},
        name: "Test",
      },
    ],
  });
  mocks.update = setRole;
  return <AgentEditorRoleMCPs roleId="role" roleIndex={0} mcps={role.mcps} />;
}
it("opens OAuth selection on demand and preserves the independently editable MCP URL", async () => {
  render(<Editor />);
  expect(screen.queryByRole("combobox")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "labelOAuthApp" }));
  const select = screen.getByRole("combobox", { name: "labelOAuth" });
  await waitFor(() =>
    expect((select as HTMLButtonElement).disabled).toBe(false),
  );
  await userEvent.click(select);
  await userEvent.click(
    await screen.findByRole("option", { name: "GitHub (OAuth)" }),
  );
  const input = screen.getByRole("textbox", {
    name: "labelUrl",
  }) as HTMLInputElement;
  expect(input.value).toBe("https://mcp.test/v1");
  expect(input.readOnly).toBe(false);
  await userEvent.clear(input);
  await userEvent.type(input, "https://other.test/mcp");
  expect(input.value).toBe("https://other.test/mcp");
  await userEvent.click(select);
  await userEvent.click(
    await screen.findByRole("option", { name: "labelAutomatic" }),
  );
  expect(input.readOnly).toBe(false);
});
it("uses server-provided choices without a browser request or reload button", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  render(
    <AgentConnectionSelect
      connections={[connection]}
      kind="oauth"
      onChange={vi.fn()}
    />,
  );
  expect((screen.getByRole("combobox") as HTMLButtonElement).disabled).toBe(
    false,
  );
  expect(screen.queryByRole("button", { name: "labelReload" })).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
