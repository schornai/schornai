import { beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "../helpers/supabase";
import { mapUser } from "../../packages/database/src/user/_mapper";

const state = vi.hoisted(() => ({
  service: undefined as any,
  claims: "admin" as unknown,
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => async (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getClaims: async () => ({
        data: { claims: { organization_roles: state.claims } },
        error: null,
      }),
    },
  }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: vi.fn(() => state.service),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { revalidatePath } from "next/cache";
import { createSupabaseServiceRoleClient } from "../../apps/web/lib/supabase/createSupabaseServiceRoleClient";
import { toggleAdmin } from "../../apps/web/app/(settings)/settings/user/_actions/toggleAdmin";

const userId = "11111111-1111-4111-8111-111111111111";
const emailUser = {
  id: userId,
  app_metadata: { provider: "email" },
  user_metadata: {},
};
function service(queries: any[] = []) {
  return {
    from: vi.fn(() => queries.shift()),
    auth: {
      admin: {
        getUserById: vi.fn(async () => ({
          data: { user: emailUser },
          error: null,
        })),
      },
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.claims = "admin";
  state.service = service();
});

describe("administrator role changes", () => {
  it.each([
    null,
    [],
    [{ organization_id: "workspace", role: "workspace-admin" }],
  ])("rejects callers without global admin rights: %j", async (claims) => {
    state.claims = claims;
    await expect(
      toggleAdmin({ userId, toggle: "promoteToAdmin" }),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(createSupabaseServiceRoleClient).not.toHaveBeenCalled();
    expect(state.service.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it.each([
    { userId: "invalid", toggle: "promoteToAdmin" },
    { userId, toggle: "admin" },
  ])("rejects invalid action input: %j", async (input) => {
    await expect(toggleAdmin(input as any)).rejects.toThrow();
    expect(createSupabaseServiceRoleClient).not.toHaveBeenCalled();
  });

  it.each(["promoteToAdmin", "demoteFromAdmin"] as const)(
    "rejects SSO accounts server-side when asked to %s",
    async (toggle) => {
      for (const user of [
        { ...emailUser, app_metadata: { provider: "sso:saml-provider" } },
        { ...emailUser, is_sso_user: true },
        { ...emailUser, app_metadata: {} },
      ]) {
        state.service = service();
        state.service.auth.admin.getUserById.mockResolvedValue({
          data: { user },
          error: null,
        });
        await expect(toggleAdmin({ userId, toggle })).rejects.toThrow(
          "SSO_ROLES_MANAGED_BY_PROVIDER",
        );
        expect(state.service.from).not.toHaveBeenCalled();
        expect(mapUser(user as any).signInMethod).toBe("sso");
      }
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("grants a global admin role to an email account and refreshes the detail page", async () => {
    const read = query();
    const write = query();
    state.service = service([read, write]);
    await toggleAdmin({ userId, toggle: "promoteToAdmin" });
    expect(state.service.auth.admin.getUserById).toHaveBeenCalledWith(userId);
    expect(state.service.from.mock.calls).toEqual([
      ["user_roles"],
      ["user_roles"],
    ]);
    expect(read.eq).toHaveBeenCalledWith("user_id", userId);
    expect(read.eq).toHaveBeenCalledWith("role", "admin");
    expect(write.insert).toHaveBeenCalledWith({
      user_id: userId,
      role: "admin",
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/settings/user/${userId}`);
    expect(mapUser(emailUser as any).signInMethod).toBe("email");
  });

  it("does not duplicate an existing admin role", async () => {
    const read = query({ data: [{ id: "role-id" }] });
    state.service = service([read]);
    await toggleAdmin({ userId, toggle: "promoteToAdmin" });
    expect(state.service.from).toHaveBeenCalledTimes(1);
    expect(read.insert).not.toHaveBeenCalled();
  });

  it("revokes only the selected user's admin roles, preserving workspace permissions", async () => {
    const write = query();
    state.service = service([write]);
    await toggleAdmin({ userId, toggle: "demoteFromAdmin" });
    expect(state.service.from).toHaveBeenCalledWith("user_roles");
    expect(write.delete).toHaveBeenCalled();
    expect(write.eq.mock.calls).toEqual([
      ["user_id", userId],
      ["role", "admin"],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/settings/user/${userId}`);
  });

  it.each([
    { data: { user: null }, error: null, message: "NOT_FOUND" },
    {
      data: { user: null },
      error: new Error("auth failed"),
      message: "auth failed",
    },
  ])(
    "does not write roles when target lookup fails: $message",
    async ({ data, error, message }) => {
      state.service.auth.admin.getUserById.mockResolvedValue({ data, error });
      await expect(
        toggleAdmin({ userId, toggle: "promoteToAdmin" }),
      ).rejects.toThrow(message);
      expect(state.service.from).not.toHaveBeenCalled();
    },
  );

  it.each(["promoteToAdmin", "demoteFromAdmin"] as const)(
    "propagates write failures for %s instead of reporting success",
    async (toggle) => {
      const failed = query({ error: new Error("write failed") });
      state.service = service(
        toggle === "promoteToAdmin" ? [query(), failed] : [failed],
      );
      await expect(toggleAdmin({ userId, toggle })).rejects.toThrow(
        "write failed",
      );
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("does not promote when reading current roles fails", async () => {
    const read = query({ error: new Error("read failed") });
    state.service = service([read]);
    await expect(
      toggleAdmin({ userId, toggle: "promoteToAdmin" }),
    ).rejects.toThrow("read failed");
    expect(state.service.from).toHaveBeenCalledTimes(1);
    expect(read.insert).not.toHaveBeenCalled();
  });
});
