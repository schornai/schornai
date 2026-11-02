import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "../packages/database/src/_shared/_types.ts";
import { createInitialAdminWithResetKey } from "../packages/database/src/user/createInitialAdminWithResetKey.ts";
import { hasUsers } from "../packages/database/src/user/hasUsers.ts";
import { query } from "./helpers/supabase.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const email = "admin@example.test";
let roles: ReturnType<typeof query>;
let keys: ReturnType<typeof query>;
let client: ReturnType<typeof fixture>;
function fixture() {
  return {
    auth: {
      admin: {
        listUsers: vi
          .fn()
          .mockResolvedValue({ data: { users: [] }, error: null }),
        createUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: userId } }, error: null }),
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: vi.fn((table: string) => (table === "user_roles" ? roles : keys)),
  };
}
const options = () => ({
  supabaseServiceRole: client as unknown as SupabaseClient,
});
beforeEach(() => {
  roles = query({ data: [{ id: "admin-role" }] });
  keys = query();
  client = fixture();
});

it("creates a confirmed first user with a one-time key and verifies the database-assigned admin role", async () => {
  const result = await createInitialAdminWithResetKey({ email }, options());
  expect(result.userId).toBe(userId);
  expect(result.passwordResetKey).toMatch(/^[a-f0-9]{64}$/);
  expect(client.auth.admin.listUsers).toHaveBeenCalledWith({
    page: 1,
    perPage: 1,
  });
  expect(client.auth.admin.createUser).toHaveBeenCalledWith(
    expect.objectContaining({ email, email_confirm: true }),
  );
  expect(keys.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      for_user_id: userId,
      reset_key: result.passwordResetKey,
    }),
  );
  expect(roles.eq).toHaveBeenCalledWith("user_id", userId);
  expect(roles.eq).toHaveBeenCalledWith("role", "admin");
  expect(roles.insert).not.toHaveBeenCalled();
  expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
});

it("refuses to create or promote accounts when any user already exists", async () => {
  client.auth.admin.listUsers.mockResolvedValue({
    data: { users: [{ id: "existing" }] },
    error: null,
  });
  await expect(
    createInitialAdminWithResetKey({ email }, options()),
  ).rejects.toThrow("INITIAL_ADMIN_EXISTS");
  expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  expect(client.from).not.toHaveBeenCalled();
});

it("fails closed and sanitizes errors when the existing-user check fails", async () => {
  client.auth.admin.listUsers.mockResolvedValue({
    data: null,
    error: new Error("private connection data"),
  });
  await expect(hasUsers(options())).rejects.toThrow(
    "INITIAL_ADMIN_CHECK_FAILED",
  );
  await expect(
    createInitialAdminWithResetKey({ email }, options()),
  ).rejects.toThrow("INITIAL_ADMIN_CHECK_FAILED");
  expect(client.auth.admin.createUser).not.toHaveBeenCalled();
});

it.each([false, true])(
  "does not deliver credentials if the admin-role check is missing or fails: %s",
  async (failed) => {
    roles = query(
      failed ? { error: new Error("private query detail") } : { data: [] },
    );
    await expect(
      createInitialAdminWithResetKey({ email }, options()),
    ).rejects.toThrow("INITIAL_ADMIN_CREATE_FAILED");
    expect(client.auth.admin.deleteUser).toHaveBeenCalledExactlyOnceWith(
      userId,
    );
    expect(roles.insert).not.toHaveBeenCalled();
  },
);

it("reports a failed cleanup distinctly without exposing backend errors", async () => {
  roles = query({ data: [] });
  client.auth.admin.deleteUser.mockResolvedValue({
    error: new Error("private connection data"),
  });
  await expect(
    createInitialAdminWithResetKey({ email }, options()),
  ).rejects.toThrow("CREATE_USER_CLEANUP_FAILED");
});
