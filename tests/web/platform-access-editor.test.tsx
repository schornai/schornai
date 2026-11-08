// @vitest-environment jsdom
import "./client-setup";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { Agent } from "../../packages/database/src/agent/_types";
import { AgentEditorRolePlatformAccess } from "../../apps/web/app/(main)/agent/_components/AgentEditorRolePlatformAccess";
import { AgentInfoToolPlatformAccess } from "../../apps/web/app/(main)/agent/_components/AgentInfoToolPlatformAccess";
import { defaultPlatformAgentAccess } from "../../packages/database/src/mcp/platformAgentPolicy";

const editor = vi.hoisted(() => ({ setAgentRole: vi.fn() }));
vi.mock("../../apps/web/app/(main)/agent/_components/AgentEditor", () => ({
  useAgentEditor: () => editor,
}));
afterEach(cleanup);
type Role = Agent["roles"][number];
function Harness({ access }: { access?: Role["toolPlatformAccess"] }) {
  const [role, setRole] = useState({
    id: "role",
    name: "Writer",
    prompt: "Keep me",
    toolPlatformAccess: access,
  } as Role);
  editor.setAgentRole.mockImplementation((id, update) => {
    expect(id).toBe("role");
    setRole(update);
  });
  return (
    <>
      <AgentEditorRolePlatformAccess role={role} />
      <output>{JSON.stringify(role)}</output>
    </>
  );
}
function draft() {
  return JSON.parse(screen.getByRole("status").textContent!);
}

it("has no global activation switch and removes the configured tool", async () => {
  const user = userEvent.setup();
  render(<Harness access={defaultPlatformAgentAccess} />);
  expect(screen.queryByRole("switch")).toBeNull();
  await user.click(screen.getByRole("button", { name: "labelRemove" }));
  await user.click(
    screen.getAllByRole("button", { name: "labelRemove" }).at(-1)!,
  );
  expect(draft().toolPlatformAccess).toBeUndefined();
  expect(draft().prompt).toBe("Keep me");
});

it("updates one approval mode and recalculates the maximum level", async () => {
  const user = userEvent.setup();
  render(<Harness access={defaultPlatformAgentAccess} />);
  await user.click(screen.getByRole("combobox", { name: "level.admin" }));
  await user.click(await screen.findByRole("option", { name: "mode.ask" }));
  expect(draft().toolPlatformAccess).toEqual({
    ...defaultPlatformAgentAccess,
    level: "admin",
    approvals: { ...defaultPlatformAgentAccess.approvals, admin: "ask" },
  });
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("combobox", { name: "level.admin" }));
  await user.click(await screen.findByRole("option", { name: "mode.off" }));
  expect(draft().toolPlatformAccess).toEqual(defaultPlatformAgentAccess);
});

it("preserves legacy consent requirements when editing an old ceiling", async () => {
  const user = userEvent.setup();
  render(<Harness access={{ active: true, level: "editor" }} />);
  expect(
    screen.getByRole("combobox", { name: "level.user" }).textContent,
  ).toContain("mode.ask");
  expect(
    screen.getByRole("combobox", { name: "level.workspace" }).textContent,
  ).toContain("mode.off");
  await user.click(screen.getByRole("combobox", { name: "level.editor" }));
  await user.click(await screen.findByRole("option", { name: "mode.off" }));
  expect(draft().toolPlatformAccess).toEqual({
    active: true,
    level: "user",
    approvals: { user: "ask", editor: "off", workspace: "off", admin: "off" },
  });
});

it.each([
  undefined,
  { name: "Writer", toolPlatformAccess: { active: true, level: "user" } },
])(
  "shows expanded policy details for optional and legacy roles",
  async (agentRole) => {
    const user = userEvent.setup();
    render(<AgentInfoToolPlatformAccess agentRole={agentRole as any} />);
    await user.click(screen.getByRole("button", { name: "labelTitle" }));
    expect(screen.getByText("descriptionPermissions")).toBeTruthy();
    expect(screen.getAllByText("mode.off")).toHaveLength(agentRole ? 3 : 1);
  },
);
