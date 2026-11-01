import { beforeEach, expect, it, vi } from "vitest";
import { getWorkspaceClaims } from "../apps/web/app/_models/getWorkspaceClaims";
import { getActivityTypeInfos } from "../packages/database/src/activity/getActivityTypeInfos";
const boundary = vi.hoisted(() => ({
  claims: [] as any,
  workspaces: [] as any[],
  agents: [] as any[],
  transcribers: [] as any[],
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: async () => boundary.claims,
}));
vi.mock("../apps/web/app/_models/getWorkspaces", () => ({
  getWorkspaces: async () => boundary.workspaces,
}));
vi.mock("../packages/database/src/agent/getAgents", () => ({
  getAgents: async () => boundary.agents,
}));
vi.mock("../packages/database/src/transcriber/getTranscribers", () => ({
  getTranscribers: async () => boundary.transcribers,
}));
beforeEach(() => {
  boundary.claims = [];
  boundary.workspaces = [
    { id: "one", name: "First" },
    { id: "two", name: "Second" },
  ];
  boundary.agents = [];
  boundary.transcribers = [];
});
it.each(["admin", [], [{ organization_id: "one", role: "editor" }]])(
  "attaches only applicable claims %j",
  async (claims) => {
    boundary.claims = claims;
    const result = await getWorkspaceClaims();
    expect(result.isAdmin).toBe(claims === "admin");
    expect(result.claims.map((workspace) => workspace.claim)).toEqual(
      claims === "admin"
        ? ["admin", "admin"]
        : Array.isArray(claims) && claims.length
          ? ["editor", undefined]
          : [undefined, undefined],
    );
    expect(
      boundary.workspaces.every((workspace) => !("claim" in workspace)),
    ).toBe(true);
  },
);
it("combines agent and transcriber appearance in the activity type lookup", async () => {
  boundary.agents = [
    {
      id: "agent",
      name: "Agent",
      icon: { type: "icon-lucide", iconName: "bot" },
      color: { type: "color-oklch-hue", oklchHue: 10 },
    },
  ];
  boundary.transcribers = [{ id: "transcriber", name: "Transcriber" }];
  const result = await getActivityTypeInfos({ supabase: {} as any });
  expect([...result.keys()]).toEqual(["agent", "transcriber"]);
  expect(result.get("agent")).toMatchObject({
    name: "Agent",
    color: { oklchHue: 10 },
  });
  expect(result.get("transcriber")).toEqual({
    name: "Transcriber",
    color: undefined,
    icon: undefined,
  });
});
