import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "../_shared/_types.ts";
import { getRealtimeDocumentPermission } from "./getRealtimeDocumentPermission.ts";

const userId = "00000000-0000-4000-8000-000000000001";
const activityId = "00000000-0000-4000-8000-000000000002";
const agentId = "00000000-0000-4000-8000-000000000003";
function client(data: unknown = null, error: unknown = null) {
  const result = { data, error };
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    or: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    supabase: {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient,
    query,
  };
}

describe("realtime document authorization", () => {
  it("only reads the authenticated user's activity list", async () => {
    const { supabase } = client();
    await expect(
      getRealtimeDocumentPermission(`activity___${userId}`, {
        userId,
        supabase,
      }),
    ).resolves.toBe("read");
    await expect(
      getRealtimeDocumentPermission(`activity___${activityId}`, {
        userId,
        supabase,
      }),
    ).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it.each(["taskQueue", "workerLog", "artifactCatalog", "services"])(
    "restricts operational document %s to verified global admin read-only access",
    async (name) => {
      const { supabase } = client();
      await expect(
        getRealtimeDocumentPermission(name, { userId, supabase }),
      ).resolves.toBeUndefined();
      await expect(
        getRealtimeDocumentPermission(name, {
          userId,
          supabase,
          isAdmin: true,
        }),
      ).resolves.toBe("read");
    },
  );
  it.each([agentId, "c" + "1".repeat(24)])(
    "uses the parent ACL for %s and keeps chat history read-only",
    async (agentId) => {
      const { supabase, query } = client({ id: "permitted" });
      const name = `activity_chat___${activityId}_${agentId}`;
      await expect(
        getRealtimeDocumentPermission(name, { userId, supabase }),
      ).resolves.toBe("read");
      await expect(
        getRealtimeDocumentPermission(
          `activity_chat_currentMessage___${activityId}_${agentId}`,
          { userId, supabase },
        ),
      ).resolves.toBe("read_write");
      expect(query.eq).toHaveBeenLastCalledWith("document_name", name);
    },
  );
  it.each([null, "error"])(
    "denies absent or failed parent ACL lookup (%s)",
    async (error) => {
      const { supabase } = client(null, error);
      await expect(
        getRealtimeDocumentPermission(
          `activity_chat_currentMessage___${activityId}_${agentId}`,
          { userId, supabase },
        ),
      ).resolves.toBeUndefined();
    },
  );
  it("matches both repository and workspace through RLS", async () => {
    const { supabase, query } = client({ id: activityId });
    await expect(
      getRealtimeDocumentPermission(`storage___repo_${userId}_${activityId}`, {
        userId,
        supabase,
      }),
    ).resolves.toBe("read");
    expect(supabase.from).toHaveBeenCalledWith("databases");
    expect(query.eq).toHaveBeenCalledWith("id", activityId);
    expect(query.eq).toHaveBeenCalledWith("organization_id", userId);
  });
  it("requires an authorized exact parent for activity storage", async () => {
    const { supabase } = client([
      { document_name: `activity_chat___${activityId}_${agentId}` },
    ]);
    await expect(
      getRealtimeDocumentPermission(`storage___activity_${activityId}`, {
        userId,
        supabase,
      }),
    ).resolves.toBe("read");
    await expect(
      getRealtimeDocumentPermission(`storage___activity_${agentId}`, {
        userId,
        supabase,
      }),
    ).resolves.toBeUndefined();
  });
  it.each([
    "model_do_stream__secret",
    "unknown",
    "storage___activity_%",
    `activity_chat_currentMessage___${activityId}_seed-agent`,
    `activity_chat___${activityId}_seed-trello-agent`,
    `activity_transcription__${activityId}_seed-transcriber`,
    "storage___repo_seed-workspace_seed-repository",
    "activity_chat_currentMessage___invalid_invalid",
    `activity_chat_currentMessage___${activityId}_seed_agent`,
    `activity_chat_currentMessage___${activityId}_seed%`,
    `activity_chat_currentMessage___${activityId}_seed,agent`,
    `activity_chat_currentMessage___${activityId}_seed.agent`,
  ])("denies unknown or malformed document %s", async (name) => {
    const { supabase } = client({ id: "should-not-query" });
    await expect(
      getRealtimeDocumentPermission(name, { userId, supabase, isAdmin: true }),
    ).resolves.toBeUndefined();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
