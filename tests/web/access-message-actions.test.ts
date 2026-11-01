import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ authorized: true, save: vi.fn() }));
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
    return {};
  },
}));
vi.mock("@schornio/aibox-package-database/config/setSystemConfig", () => ({
  setSystemConfig: state.save,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { updateAccessMessage } from "../../apps/web/app/(settings)/settings/theme/_actions/updateAccessMessage";
beforeEach(() => {
  state.authorized = true;
  state.save.mockReset();
});
it("requires administrator authorization before saving templates", async () => {
  state.authorized = false;
  await expect(updateAccessMessage({ localized: {} })).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(state.save).not.toHaveBeenCalled();
});
it("validates placeholders before writing and supports restoring defaults", async () => {
  await expect(
    updateAccessMessage({
      localized: { de: { subject: "Hello", body: "{{invalid}}" } },
    }),
  ).rejects.toThrow();
  expect(state.save).not.toHaveBeenCalled();
  await updateAccessMessage({ localized: {} });
  expect(state.save).toHaveBeenCalledWith("accessMessage", '{"localized":{}}', {
    supabase: {},
  });
});
