import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "../../packages/database/src/_shared/_types";

const state = vi.hoisted(() => ({
  db: undefined as SupabaseClient | undefined,
  elevate: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => state.db,
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: state.elevate,
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => async (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTranscriber } from "../../apps/web/app/(main)/app/transcribe/_actions/createTranscriber";
import { updateTranscriber } from "../../apps/web/app/(main)/app/transcribe/_actions/updateTranscriber";
import { deleteTranscriber } from "../../apps/web/app/(main)/app/transcribe/_actions/deleteTranscriber";

const transcriber = {
  id: "transcriber",
  identifier: "test",
  name: "Test",
  workspaceId: "own",
  version: "transcriber-v2",
};
const actions = [
  ["create", "POST", () => createTranscriber({ transcriber })],
  ["update", "PATCH", () => updateTranscriber({ transcriber })],
  [
    "delete",
    "DELETE",
    () => deleteTranscriber({ transcriberId: transcriber.id }),
  ],
] as const;

function useDatabase(outcome: "success" | "filtered" | "forbidden") {
  const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
    if (outcome === "forbidden")
      return Response.json(
        {
          code: "42501",
          message: "new row violates row-level security policy",
        },
        { status: 403 },
      );

    // PostgREST rejects an empty mutation result only when a single row was
    // requested. Without that requirement, an RLS-filtered write succeeds.
    const headers = new Headers(init?.headers);
    if (outcome === "filtered") {
      if (headers.get("Accept") === "application/vnd.pgrst.object+json")
        return Response.json(
          { code: "PGRST116", message: "The result contains 0 rows" },
          { status: 406 },
        );
      return Response.json([]);
    }
    return Response.json({ id: transcriber.id });
  });
  state.db = createClient("http://supabase.test", "public-anon-key", {
    accessToken: async () => "user-session-token",
    global: { fetch },
  });
  return fetch;
}

beforeEach(() => vi.clearAllMocks());

describe("transcriber actions with user-scoped RLS", () => {
  it.each(actions)(
    "%s uses the caller's session and completes after a successful write",
    async (name, method, action) => {
      const fetch = useDatabase("success");
      await action();

      expect(fetch).toHaveBeenCalledOnce();
      const [url, init] = fetch.mock.calls[0]!;
      expect(new URL(String(url)).pathname).toBe("/rest/v1/transcribers");
      expect(init?.method).toBe(method);
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Bearer user-session-token",
      );
      expect(state.elevate).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/");
      if (name === "update") expect(redirect).not.toHaveBeenCalled();
      else
        expect(redirect).toHaveBeenCalledExactlyOnceWith(
          name === "create" ? "/app/transcribe/transcriber" : "/app/transcribe",
        );
    },
  );

  it.each(actions)(
    "%s does not invalidate or redirect after an RLS rejection",
    async (_name, _method, action) => {
      useDatabase("forbidden");
      await expect(action()).rejects.toMatchObject({ code: "42501" });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
      expect(state.elevate).not.toHaveBeenCalled();
    },
  );

  it.each(actions.slice(1))(
    "%s fails when RLS hides the row or it no longer exists",
    async (_name, _method, action) => {
      useDatabase("filtered");
      await expect(action()).rejects.toMatchObject({ code: "PGRST116" });
      expect(revalidatePath).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    },
  );

  it("propagates the RLS rejection when moving to an unauthorized workspace", async () => {
    const fetch = useDatabase("forbidden");
    await expect(
      updateTranscriber({
        transcriber: { ...transcriber, workspaceId: "other" },
      }),
    ).rejects.toMatchObject({ code: "42501" });
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toMatchObject({
      organization_id: "other",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
