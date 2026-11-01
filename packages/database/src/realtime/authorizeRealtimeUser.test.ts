import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "../_shared/_types.ts";
import { authorizeRealtimeUser } from "./authorizeRealtimeUser.ts";

const userId = "00000000-0000-4000-8000-000000000001";
function client({
  userError = null,
  claimsError = null,
  sub = userId,
  exp = Date.now() / 1000 + 60,
  roles = [] as unknown,
  user = { id: userId, user_metadata: { admin: true } } as unknown,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: userError }),
      getClaims: vi.fn().mockResolvedValue({
        data: { claims: { sub, exp, organization_roles: roles } },
        error: claimsError,
      }),
    },
  } as unknown as SupabaseClient;
}
it("requires both server-verified identity and matching signed claims", async () => {
  const supabase = client();
  await expect(
    authorizeRealtimeUser("jwt", `activity___${userId}`, { supabase }),
  ).resolves.toMatchObject({ permission: "read" });
  expect(supabase.auth.getUser).toHaveBeenCalledWith("jwt");
  expect(supabase.auth.getClaims).toHaveBeenCalledWith("jwt");
});
it.each([
  { userError: "deleted user" },
  { claimsError: "bad signature" },
  { sub: "other-user" },
  { exp: 0 },
  { exp: NaN },
  { user: null },
])("denies invalid authentication %j", async (options) => {
  await expect(
    authorizeRealtimeUser("jwt", `activity___${userId}`, {
      supabase: client(options as any),
    }),
  ).resolves.toBeUndefined();
});
it("never authorizes an operational document from editable user metadata", async () => {
  await expect(
    authorizeRealtimeUser("jwt", "taskQueue", { supabase: client() }),
  ).resolves.toBeUndefined();
  await expect(
    authorizeRealtimeUser("jwt", "taskQueue", {
      supabase: client({ roles: "admin" }),
    }),
  ).resolves.toMatchObject({ permission: "read" });
});
