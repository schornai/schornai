vi.mock("server-only", () => ({}));
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeStorageMutation } from "../../apps/web/lib/authorizeStorageMutation";
import { serverActionClient } from "../../apps/web/lib/serverActionClient";
const state = vi.hoisted(() => ({
  permission: vi.fn(),
  claims: [] as any,
  user: vi.fn(),
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUser", () => ({
  getCurrentUser: state.user,
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: async () => state.claims,
}));
vi.mock(
  "@schornio/aibox-package-database/realtime/getRealtimeDocumentPermission",
  () => ({
    getRealtimeDocumentPermission: state.permission,
  }),
);
vi.mock("next-safe-action", () => ({
  createSafeActionClient: (config: unknown) => config,
}));
beforeEach(() => {
  state.permission.mockReset().mockResolvedValue("read");
  state.user.mockReset().mockResolvedValue({ id: "user" });
  state.claims = [{ organization_id: "workspace", role: "editor" }];
});
const supabase = { auth: {} } as any;
describe("privileged web mutation boundaries", () => {
  it("authorizes the exact activity parent rather than any colliding activity id", async () => {
    await authorizeStorageMutation(
      { type: "activity", activityId: "activity", agentId: "agent" },
      supabase,
    );
    expect(state.permission).toHaveBeenCalledWith(
      "activity_chat___activity_agent",
      { supabase, userId: "user" },
    );
    await authorizeStorageMutation(
      {
        type: "activity-transcription",
        activityId: "activity",
        transcriberId: "transcriber",
      },
      supabase,
    );
    expect(state.permission).toHaveBeenLastCalledWith(
      "activity_transcription__activity_transcriber",
      { supabase, userId: "user" },
    );
  });
  it("rejects foreign activities and missing authenticated users", async () => {
    state.permission.mockResolvedValue(undefined);
    await expect(
      authorizeStorageMutation(
        { type: "activity", activityId: "other", agentId: "agent" },
        supabase,
      ),
    ).rejects.toThrow("NOT_AUTHORIZED");
    state.permission.mockClear();
    state.user.mockRejectedValue(new Error("not signed in"));
    await expect(
      authorizeStorageMutation(
        { type: "activity", activityId: "other", agentId: "agent" },
        supabase,
      ),
    ).rejects.toThrow("not signed in");
    expect(state.permission).not.toHaveBeenCalled();
  });
  it.each(
    [
      [],
      [{ organization_id: "workspace", role: "user" }],
      [{ organization_id: "other", role: "editor" }],
    ].map((claims) => ({ claims })),
  )(
    "denies repository mutation for insufficient claims %j",
    async ({ claims }) => {
      state.claims = claims;
      await expect(
        authorizeStorageMutation(
          {
            type: "documentRepository",
            workspaceId: "workspace",
            documentRepositoryId: "repo",
          },
          supabase,
        ),
      ).rejects.toThrow("NOT_AUTHORIZED");
    },
  );
  it.each(
    [
      "admin",
      [{ organization_id: "workspace", role: "editor" }],
      [{ organization_id: "workspace", role: "workspace-admin" }],
    ].map((claims) => ({ claims })),
  )("permits authorized repository editors %j", async ({ claims }) => {
    state.claims = claims;
    await expect(
      authorizeStorageMutation(
        {
          type: "documentRepository",
          workspaceId: "workspace",
          documentRepositoryId: "repo",
        },
        supabase,
      ),
    ).resolves.toEqual({ user: { id: "user" }, userClaims: claims });
  });
  it("never returns or logs raw server action errors", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("api-key-secret"), {
      details: "private SQL",
      cause: "password",
    });
    expect((serverActionClient as any).handleServerError(error)).toBe(
      "INTERNAL_SERVER_ERROR",
    );
    expect(log).not.toHaveBeenCalled();
  });
});
