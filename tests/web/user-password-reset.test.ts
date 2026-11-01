import { beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "../helpers/supabase";
import { createUserWithResetKey } from "../../packages/database/src/user/createUserWithResetKey";
import { redeemPasswordResetKey } from "../../packages/database/src/user/redeemPasswordResetKey";

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
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => state.service,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createUser } from "../../apps/web/app/(settings)/settings/user/_actions/createUser";
import { resetPassword } from "../../apps/web/app/signin/_actions/resetPassword";

const input = {
  email: "user@example.test",
  password: "new-password",
  passwordResetKey: "secret-key",
};
const key = { id: "key-id", for_user_id: "user-id" };
function builder(response: any = { data: null, error: null }) {
  const q = query(response);
  q.is = vi.fn(() => q);
  q.gt = vi.fn(() => q);
  return q;
}
function service(queries: any[]) {
  return {
    from: vi.fn(() => queries.shift()),
    auth: {
      admin: {
        createUser: vi.fn(async () => ({
          data: { user: { id: "user-id" } },
          error: null,
        })),
        deleteUser: vi.fn(async () => ({ error: null })),
        getUserById: vi.fn(async () => ({
          data: { user: { id: "user-id", email: input.email } },
          error: null,
        })),
        updateUserById: vi.fn(async () => ({ error: null })),
      },
    },
  } as any;
}
beforeEach(() => {
  vi.clearAllMocks();
  state.authorized = true;
});

describe("user creation", () => {
  it("passes trimmed optional names to the profile creation trigger", async () => {
    state.service = service([builder()]);
    await createUser({
      email: input.email,
      firstName: " Ada ",
      lastName: " Lovelace ",
    });
    expect(state.service.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: { first_name: "Ada", last_name: "Lovelace" },
      }),
    );
  });
  it("authorizes administrators before calling the privileged API", async () => {
    state.service = service([]);
    state.authorized = false;
    await expect(createUser({ email: input.email })).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
    expect(state.service.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it("validates email before creating an account", async () => {
    state.service = service([]);
    await expect(createUser({ email: "bad" })).rejects.toThrow();
    expect(state.service.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it("creates a random initial password and a distinct seven-day key", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
    const insert = builder();
    state.service = service([insert]);
    const result = (await createUser({ email: ` ${input.email} ` })) as any;
    expect(result.passwordResetKey).toMatch(/^[a-f0-9]{64}$/);
    expect(result.expires).toBe("2026-10-17T12:00:00.000Z");
    expect(insert.insert).toHaveBeenCalledWith({
      for_user_id: "user-id",
      reset_key: result.passwordResetKey,
      expires: result.expires,
    });
    const created = state.service.auth.admin.createUser.mock.calls[0][0];
    expect(created).toMatchObject({ email: input.email, email_confirm: true });
    expect(created.password.length).toBeGreaterThanOrEqual(48);
    expect(created.password).not.toBe(result.passwordResetKey);
  });
  it("does not insert a key when the email already exists", async () => {
    const db = service([]);
    db.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: "exists" },
    });
    await expect(
      createUserWithResetKey(
        { email: input.email },
        { supabaseServiceRole: db },
      ),
    ).rejects.toThrow("CREATE_USER_FAILED");
    expect(db.from).not.toHaveBeenCalled();
  });
  it("removes the newly created account if storing its key fails", async () => {
    const db = service([builder({ error: new Error("write failed") })]);
    await expect(
      createUserWithResetKey(
        { email: input.email },
        { supabaseServiceRole: db },
      ),
    ).rejects.toThrow("CREATE_USER_FAILED");
    expect(db.auth.admin.deleteUser).toHaveBeenCalledWith("user-id");
  });
});

describe("key redemption", () => {
  it("checks expiration, email and unused status before claiming and updating", async () => {
    const read = builder({ data: key });
    const claim = builder({ data: { id: key.id } });
    const db = service([read, claim]);
    await redeemPasswordResetKey(
      {
        ...input,
        email: input.email.toUpperCase(),
      },
      { supabaseServiceRole: db },
    );
    expect(read.eq).toHaveBeenCalledWith("reset_key", input.passwordResetKey);
    expect(read.gt).toHaveBeenCalledWith("expires", expect.any(String));
    expect(read.is).toHaveBeenCalledWith("used", null);
    expect(claim.is).toHaveBeenCalledWith("used", null);
    expect(claim.gt).toHaveBeenCalledWith("expires", expect.any(String));
    expect(db.auth.admin.updateUserById).toHaveBeenCalledWith("user-id", {
      password: input.password,
    });
  });
  it("rejects missing, expired or previously used keys without touching auth", async () => {
    const db = service([builder()]);
    await expect(
      redeemPasswordResetKey(input, { supabaseServiceRole: db }),
    ).rejects.toThrow("INVALID_RESET_KEY");
    expect(db.auth.admin.getUserById).not.toHaveBeenCalled();
    expect(db.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it("rejects another email without consuming the key", async () => {
    const db = service([builder({ data: key })]);
    await expect(
      redeemPasswordResetKey(
        { ...input, email: "other@example.test" },
        { supabaseServiceRole: db },
      ),
    ).rejects.toThrow("INVALID_RESET_KEY");
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it("does not update passwords if another request consumed the key", async () => {
    const db = service([builder({ data: key }), builder()]);
    await expect(
      redeemPasswordResetKey(input, { supabaseServiceRole: db }),
    ).rejects.toThrow("INVALID_RESET_KEY");
    expect(db.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it("allows exactly one of two concurrent redemptions to change the password", async () => {
    let used = false;
    const db = service([]);
    db.from.mockImplementation(() => {
      const q = builder({ data: key });
      q.update.mockImplementation(() => {
        const claimed = used ? null : { id: key.id };
        used = true;
        return builder({ data: claimed });
      });
      return q;
    });
    const results = await Promise.allSettled([
      redeemPasswordResetKey(input, { supabaseServiceRole: db }),
      redeemPasswordResetKey(input, { supabaseServiceRole: db }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(db.auth.admin.updateUserById).toHaveBeenCalledTimes(1);
  });
  it("releases the claim after a definite password-policy rejection", async () => {
    const release = builder();
    const db = service([
      builder({ data: key }),
      builder({ data: key }),
      release,
    ]);
    db.auth.admin.updateUserById.mockResolvedValue({ error: { status: 422 } });
    await expect(
      redeemPasswordResetKey(input, { supabaseServiceRole: db }),
    ).rejects.toThrow("RESET_PASSWORD_FAILED");
    expect(release.update).toHaveBeenCalledWith({ used: null });
    expect(release.eq).toHaveBeenCalledWith("used", expect.any(String));
  });
  it("keeps the key consumed when the password update has an uncertain outcome", async () => {
    const db = service([builder({ data: key }), builder({ data: key })]);
    db.auth.admin.updateUserById.mockResolvedValue({ error: { status: 503 } });
    await expect(
      redeemPasswordResetKey(input, { supabaseServiceRole: db }),
    ).rejects.toThrow("RESET_PASSWORD_FAILED");
    expect(db.from).toHaveBeenCalledTimes(2);
  });
  it.each([
    { password: "short", passwordAgain: "short" },
    { password: "password-a", passwordAgain: "password-b" },
    { passwordResetKey: "" },
  ])(
    "validates passwords and key before accessing the service: %j",
    async (override) => {
      state.service = service([]);
      await expect(
        resetPassword({ ...input, passwordAgain: input.password, ...override }),
      ).rejects.toThrow();
      expect(state.service.from).not.toHaveBeenCalled();
    },
  );
});
