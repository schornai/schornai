import { expect, it, vi } from "vitest";
import { resolveResourceIdentity } from "../packages/database/src/xrag/resolveResourceIdentity.ts";
import {
  importedResourceId,
  nativeResourceId,
} from "../packages/xrag/src/identity.ts";
import { query } from "./helpers/supabase.ts";
const origin = nativeResourceId("documentRepository", "source");
it("preserves a saved runtime identifier independently of the database ID", async () => {
  const map = query({ data: { local_id: "saved-id" }, error: null });
  const saved = query({
    data: { config: { identifier: "custom-runtime-name" } },
    error: null,
  });
  const supabase = {
    from: vi.fn().mockReturnValueOnce(map).mockReturnValueOnce(saved),
  };
  await expect(
    resolveResourceIdentity("documentRepository", origin, "workspace", {
      supabase: supabase as any,
    }),
  ).resolves.toEqual({
    localId: "saved-id",
    identifier: "custom-runtime-name",
  });
  expect(saved.eq.mock.calls).toEqual([
    ["id", "saved-id"],
    ["organization_id", "workspace"],
  ]);
});
it("predicts both identifiers for dependencies imported later", async () => {
  const supabase = { from: vi.fn(() => query({ data: null, error: null })) };
  const expected = importedResourceId("workspace", "transcriber", origin);
  await expect(
    resolveResourceIdentity("transcriber", origin, "workspace", {
      supabase: supabase as any,
    }),
  ).resolves.toEqual({ localId: expected, identifier: expected });
});
it("agents have no separate runtime identifier", async () => {
  const supabase = {
    from: vi.fn(() => query({ data: { local_id: "agent-id" }, error: null })),
  };
  await expect(
    resolveResourceIdentity("agent", origin, "workspace", {
      supabase: supabase as any,
    }),
  ).resolves.toEqual({ localId: "agent-id", identifier: "agent-id" });
  expect(supabase.from).toHaveBeenCalledTimes(1);
});
it.each([null, [], {}, { identifier: 1 }, { identifier: "" }])(
  "falls back for absent or legacy config %j",
  async (config) => {
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(
          query({ data: { local_id: "saved" }, error: null }),
        )
        .mockReturnValueOnce(query({ data: { config }, error: null })),
    };
    await expect(
      resolveResourceIdentity("transcriber", origin, "workspace", {
        supabase: supabase as any,
      }),
    ).resolves.toEqual({ localId: "saved", identifier: "saved" });
  },
);
it.each([true, false])(
  "sanitizes mapping and resource read failures",
  async (mappingFails) => {
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(
          query({
            data: null,
            error: mappingFails ? new Error("private") : null,
          }),
        )
        .mockReturnValueOnce(query({ error: new Error("private") })),
    };
    await expect(
      resolveResourceIdentity("transcriber", origin, "workspace", {
        supabase: supabase as any,
      }),
    ).rejects.toThrow("XRAG_IDENTITY_FAILED");
  },
);
