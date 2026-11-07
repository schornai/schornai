import { describe, it, expect } from "vitest";
import { createPlatformTools } from "../packages/realtime/src/platform/tools";
import { platformAgentApprovals } from "../packages/realtime/src/platform/agentTools";
import {
  defaultPlatformApprovals,
  getPlatformApprovals,
  platformPolicyCeiling,
} from "../packages/database/src/mcp/platformAgentPolicy";
import type { PlatformContext } from "../packages/realtime/src/platform/registry";
function context(approvals = { ...defaultPlatformApprovals }): PlatformContext {
  return {
    approvals,
    level: platformPolicyCeiling(approvals),
    claims: "admin",
    userId: "me",
    supabase: {},
    supabaseServiceRole: {},
  } as PlatformContext;
}
function approval(c: PlatformContext, name: string, input = {}) {
  const config = platformAgentApprovals(createPlatformTools(c));
  const rule = config[name];
  return typeof rule === "function" ? rule(input, {} as never) : rule;
}
describe("platform agent approval policy", () => {
  it("defaults to automatic user/editor, workspace approval and disabled admin", () => {
    const c = context();
    expect(approval(c, "platform_profile_name_update")).toBe("approved");
    expect(approval(c, "platform_file_write")).toBe("approved");
    expect(approval(c, "platform_agent_create")).toBe("user-approval");
    expect(
      createPlatformTools(c).some((t) => t.name === "platform_user_create"),
    ).toBe(false);
  });
  it("keeps legacy ceilings without automatically approving existing writes", () => {
    expect(getPlatformApprovals({ level: "editor" })).toEqual({
      user: "ask",
      editor: "ask",
      workspace: "off",
      admin: "off",
    });
  });
  it("supports independent levels including asking for read-only user tools", () => {
    const c = context({
      user: "ask",
      editor: "off",
      workspace: "auto",
      admin: "off",
    });
    expect(approval(c, "platform_agents_list")).toBe("user-approval");
    expect(approval(c, "platform_agent_create")).toBe("approved");
    expect(
      createPlatformTools(c).some((t) => t.name === "platform_file_write"),
    ).toBe(false);
  });
  it("never widens actual caller permissions", () => {
    const c = context();
    c.claims = [{ organization_id: "a", role: "user" }];
    expect(
      createPlatformTools(c).some((t) => t.name === "platform_agent_create"),
    ).toBe(false);
    expect(
      createPlatformTools(c).some((t) => t.name === "platform_file_write"),
    ).toBe(false);
  });
  it.each([
    "platform_asset_upload",
    "platform_asset_upload_url",
    "platform_profile_password_reset",
  ])("prevents privileged variants bypassing admin-off: %s", async (name) => {
    const c = context();
    const input = name.includes("asset")
      ? { kind: "theme" }
      : { userId: "someone-else" };
    expect(approval(c, name, input)).toBe("denied");
    await expect(
      createPlatformTools(c)
        .find((t) => t.name === name)!
        .execute(input),
    ).rejects.toThrow("PLATFORM_TOOL_DISABLED");
  });
  it("asks for admin variants while leaving own avatar uploads automatic", () => {
    const c = context({
      user: "auto",
      editor: "auto",
      workspace: "ask",
      admin: "ask",
    });
    expect(approval(c, "platform_asset_upload", { kind: "avatar" })).toBe(
      "approved",
    );
    expect(
      approval(c, "platform_asset_upload", { kind: "avatar", userId: "other" }),
    ).toBe("user-approval");
    expect(approval(c, "platform_asset_upload", { kind: "theme" })).toBe(
      "user-approval",
    );
  });
  it("rechecks off at execution even after tools were discovered", async () => {
    const c = context();
    const tool = createPlatformTools(c).find(
      (t) => t.name === "platform_agent_create",
    )!;
    c.approvals!.workspace = "off";
    await expect(tool.execute({})).rejects.toThrow("PLATFORM_TOOL_DISABLED");
  });
  it("all off exposes no platform tools", () => {
    expect(
      createPlatformTools(
        context({ user: "off", editor: "off", workspace: "off", admin: "off" }),
      ),
    ).toEqual([]);
  });
});

it("requires a human decision before granting another tool approval", () => {
  const c = context();
  expect(approval(c, "platform_chat_tool_approval", { approved: true })).toBe(
    "user-approval",
  );
  expect(approval(c, "platform_chat_tool_approval", { approved: false })).toBe(
    "approved",
  );
});
