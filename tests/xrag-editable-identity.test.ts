import { expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { nativeResourceId } from "../packages/xrag/src/identity.ts";
import { setResourceIdentity } from "../packages/database/src/xrag/setResourceIdentity.ts";

const before = nativeResourceId("documentRepository", "repository");
const after = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const input = {
  kind: "documentRepository" as const,
  id: "repository",
  globalId: after,
  expectedGlobalId: before,
};
function setup({
  role = "workspace-admin",
  workspace = "workspace",
  current = before,
  response = { data: { origin_id: after }, error: null } as any,
} = {}) {
  const update = query(response);
  const supabaseServiceRole = {
    from: vi
      .fn()
      .mockReturnValueOnce(query({ data: null, error: null }))
      .mockReturnValueOnce(
        query({
          data: { origin_id: current, workspace_id: "workspace" },
          error: null,
        }),
      )
      .mockReturnValueOnce(update),
  };
  const supabase = {
    from: vi.fn(() =>
      query({
        data: {
          id: "repository",
          organization_id: "workspace",
          name: "Files",
          description: "",
          config: { type: "database-v2", identifier: "repository" },
        },
        error: null,
      }),
    ),
  };
  return {
    update,
    supabaseServiceRole,
    options: {
      supabase,
      supabaseServiceRole,
      authenticated: {
        userId: "user",
        claims: [{ organization_id: workspace, role }],
      },
    },
  };
}
it("changes a saved identity only for the authorized workspace and displayed version", async () => {
  const test = setup();
  await expect(
    setResourceIdentity(input, test.options as any),
  ).resolves.toEqual({ globalId: after });
  expect(test.update.update).toHaveBeenCalledWith({ origin_id: after });
  expect(test.update.eq.mock.calls).toEqual([
    ["kind", "documentRepository"],
    ["local_id", "repository"],
    ["workspace_id", "workspace"],
    ["origin_id", before],
  ]);
});
it.each([{ role: "editor" }, { workspace: "other" }])(
  "does not touch identities when permissions fail: %j",
  async (settings) => {
    const test = setup(settings);
    await expect(
      setResourceIdentity(input, test.options as any),
    ).rejects.toThrow("NOT_AUTHORIZED");
    expect(test.supabaseServiceRole.from).not.toHaveBeenCalled();
  },
);
it("rejects stale identity edits before updating", async () => {
  const test = setup({ current: after });
  await expect(setResourceIdentity(input, test.options as any)).rejects.toThrow(
    "XRAG_IDENTITY_CHANGED",
  );
  expect(test.update.update).not.toHaveBeenCalled();
});
it.each([
  [{ data: null, error: null }, "XRAG_IDENTITY_CHANGED"],
  [
    {
      data: null,
      error: { code: "23505", message: "private constraint info" },
    },
    "XRAG_IDENTITY_EXISTS",
  ],
  [
    { data: null, error: { message: "private details" } },
    "XRAG_IDENTITY_FAILED",
  ],
])(
  "handles concurrent edits and collisions without exposing database details",
  async (response, error) => {
    const test = setup({ response });
    await expect(
      setResourceIdentity(input, test.options as any),
    ).rejects.toThrow(error as string);
  },
);
it("validates UUIDs before any database access", async () => {
  const test = setup();
  await expect(
    setResourceIdentity(
      { ...input, globalId: "Invalid Title" },
      test.options as any,
    ),
  ).rejects.toThrow();
  expect(test.options.supabase.from).not.toHaveBeenCalled();
});
