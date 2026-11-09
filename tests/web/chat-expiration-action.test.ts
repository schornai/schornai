import { beforeEach, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  access: vi.fn(),
  save: vi.fn(),
  service: vi.fn(),
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (fn: any) => (input: any) =>
        fn({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: mocks.service,
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUser", () => ({
  getCurrentUser: mocks.user,
}));
vi.mock("@schornio/aibox-package-database/chat/getChatExpiration", () => ({
  getChatExpiration: mocks.access,
}));
vi.mock("@schornio/aibox-package-database/chat/setChatExpiration", () => ({
  setChatExpiration: mocks.save,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { setChatExpiration } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_actions/setChatExpiration";
const input = {
  agentId: "11111111-1111-4111-8111-111111111111",
  activityId: "22222222-2222-4222-8222-222222222222",
  seconds: 60,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "authenticated" });
  mocks.access.mockResolvedValue({ seconds: null });
  mocks.service.mockReturnValue({ service: true });
  mocks.save.mockResolvedValue(undefined);
});
it("authorizes before creating the privileged client and invalidates only after saving", async () => {
  await setChatExpiration(input);
  expect(mocks.access.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.service.mock.invocationCallOrder[0],
  );
  expect(mocks.save).toHaveBeenCalledWith(input, {
    userId: "authenticated",
    supabase: { service: true },
  });
  expect(revalidatePath).toHaveBeenCalledWith(
    `/agent/${input.agentId}/${input.activityId}`,
    "layout",
  );
});
it("does not create a privileged client for unauthorized chats or invalidate failed saves", async () => {
  mocks.access.mockRejectedValueOnce(new Error("denied"));
  await expect(setChatExpiration(input)).rejects.toThrow("denied");
  expect(mocks.service).not.toHaveBeenCalled();
  mocks.save.mockRejectedValueOnce(new Error("offline"));
  await expect(setChatExpiration(input)).rejects.toThrow("offline");
  expect(revalidatePath).not.toHaveBeenCalled();
});
