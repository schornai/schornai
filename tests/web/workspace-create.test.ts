import { beforeEach, expect, it, vi } from "vitest";
import { database } from "../helpers/supabase";

const state = vi.hoisted(() => ({
  service: undefined as any,
  authorized: true,
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => async (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/saveCreateSupabaseServiceRoleClient", () => ({
  saveCreateSupabaseServiceRoleClient: async () => {
    if (!state.authorized) throw new Error("NOT_AUTHORIZED");
    return state.service;
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createWorkspace } from "../../apps/web/app/(settings)/settings/workspace/_actions/createWorkspace";

let builders: ReturnType<typeof database>["builders"];
beforeEach(() => {
  vi.clearAllMocks();
  state.authorized = true;
  ({ supabase: state.service, builders } = database({
    organizations: { data: null },
  }));
});

it("creates a workspace and redirects to its editor", async () => {
  await createWorkspace({ name: "  Team  ", description: "Our team" });
  const row = builders.organizations.insert.mock.calls[0][0];
  expect(row).toMatchObject({ name: "Team", auto_join: false });
  expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.parse(row.description)).toEqual({
    description: "Our team",
    version: "workspace-config-v1",
  });
  expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  expect(redirect).toHaveBeenCalledWith(`/settings/workspace/${row.id}`);
});

it.each(["", "   "])(
  "rejects empty names (%j) before writing",
  async (name) => {
    await expect(createWorkspace({ name, description: "" })).rejects.toThrow();
    expect(state.service.from).not.toHaveBeenCalled();
  },
);

it("requires admin authorization before writing", async () => {
  state.authorized = false;
  await expect(
    createWorkspace({ name: "Team", description: "" }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(state.service.from).not.toHaveBeenCalled();
  expect(redirect).not.toHaveBeenCalled();
});

it("does not redirect or revalidate when persistence fails", async () => {
  state.service = database({
    organizations: { error: new Error("write failed") },
  }).supabase;
  await expect(
    createWorkspace({ name: "Team", description: "" }),
  ).rejects.toThrow("write failed");
  expect(revalidatePath).not.toHaveBeenCalled();
  expect(redirect).not.toHaveBeenCalled();
});
