import { expect, it, vi } from "vitest";
import { createPlatformTools } from "../packages/realtime/src/platform/tools.ts";
import { query } from "./helpers/supabase.ts";
const mocks = vi.hoisted(() => ({ agent: vi.fn(), permission: vi.fn() }));
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: mocks.agent,
}));
vi.mock(
  "@schornio/aibox-database/realtime/getRealtimeDocumentPermission",
  () => ({ getRealtimeDocumentPermission: mocks.permission }),
);
const input = {
  agentId: "11111111-1111-4111-8111-111111111111",
  activityId: "22222222-2222-4222-8222-222222222222",
  seconds: 43_200,
};
it("uses authenticated identity, workspace authorization and the same atomic operation for MCP", async () => {
  mocks.agent.mockResolvedValue({ workspaceId: "workspace" });
  mocks.permission.mockResolvedValue("read");
  const rpc = vi
    .fn()
    .mockResolvedValue({ data: "2030-01-01T00:00:00Z", error: null });
  const context = {
    level: "user",
    claims: [{ organization_id: "workspace", role: "user" }],
    userId: "actual-user",
    supabase: {
      from: () => query({ data: { expires_at: null, expiry_seconds: null } }),
    },
    supabaseServiceRole: { rpc },
  } as any;
  const tools = createPlatformTools(context);
  const set = tools.find((t) => t.name === "platform_chat_expiration_set")!;
  const get = tools.find((t) => t.name === "platform_chat_expiration_get")!;
  await expect(set.execute({ ...input, userId: "injected" })).resolves.toEqual({
    seconds: 43_200,
    expiresAt: "2030-01-01T00:00:00Z",
  });
  expect(rpc).toHaveBeenCalledWith(
    "set_chat_expiration",
    expect.objectContaining({ p_user_id: "actual-user" }),
  );
  await expect(get.execute(input)).resolves.toEqual({
    seconds: null,
    expiresAt: null,
  });
  await expect(set.execute({ ...input, seconds: 3600 })).rejects.toThrow();
  mocks.permission.mockResolvedValue(undefined);
  await expect(set.execute(input)).rejects.toThrow("NOT_AUTHORIZED");
  mocks.permission.mockResolvedValue("read");
  mocks.agent.mockResolvedValue({ workspaceId: "another-workspace" });
  await expect(set.execute(input)).rejects.toThrow("NOT_AUTHORIZED");
  expect(rpc).toHaveBeenCalledTimes(1);
});
