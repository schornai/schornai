const relatedObjects = vi.hoisted(() => vi.fn());
vi.mock("../packages/database/src/xrag/getXRAGRelatedObjects.ts", () => ({
  getXRAGRelatedObjects: relatedObjects,
}));
import { expect, it, vi, beforeEach } from "vitest";
import { query } from "./helpers/supabase.ts";
import { listXRAGPackages } from "../packages/database/src/xrag/listXRAGPackages.ts";
import { createXRAGPackage } from "../packages/database/src/xrag/createXRAGPackage.ts";
import { addXRAGPackageItem } from "../packages/database/src/xrag/addXRAGPackageItem.ts";
import { removeXRAGPackageItem } from "../packages/database/src/xrag/removeXRAGPackageItem.ts";
import { deleteXRAGPackage } from "../packages/database/src/xrag/deleteXRAGPackage.ts";
import { exportXRAGPackage } from "../packages/database/src/xrag/exportXRAGPackage.ts";
const resource = vi.hoisted(() => vi.fn());
vi.mock("../packages/database/src/xrag/getAuthorizedResource.ts", () => ({
  getAuthorizedResource: resource,
}));
const packageId = "11111111-1111-4111-8111-111111111111";
const selection = { kind: "agent" as const, id: "agent" };
const input = { packageId, selection };
function setup({
  packages = [{ id: packageId, name: "Package", xrag_package_items: [] }],
  error = null,
  mutationError = null,
  role = "workspace-admin",
}: {
  packages?: any[];
  error?: any;
  mutationError?: { message: string } | null;
  role?: string;
} = {}) {
  const list = query({ data: packages, error });
  const mutation = query({ data: { id: packageId }, error: mutationError });
  const supabase = {
    from: vi.fn().mockReturnValueOnce(list).mockReturnValue(mutation),
  };
  return {
    list,
    mutation,
    options: {
      supabase,
      supabaseServiceRole: {},
      authenticated: {
        userId: "owner",
        claims: [{ organization_id: "workspace", role }],
      },
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  resource.mockResolvedValue({ name: "Agent" });
});
it("limits lists to the authenticated owner and current role", async () => {
  const f = setup();
  expect(await listXRAGPackages(f.options as any)).toHaveLength(1);
  expect(f.list.eq).toHaveBeenCalledWith("owner_id", "owner");
  const denied = setup({ role: "editor" });
  await expect(listXRAGPackages(denied.options as any)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(denied.options.supabase.from).not.toHaveBeenCalled();
});
it("creates a trimmed named package for the caller", async () => {
  const f = setup();
  await createXRAGPackage({ name: " Demo " }, f.options as any);
  expect(f.list.insert).toHaveBeenCalledWith({
    name: "Demo",
    owner_id: "owner",
  });
});
it("checks exact resource access before adding a deduplicated selection", async () => {
  const f = setup();
  await addXRAGPackageItem(input, f.options as any);
  expect(resource).toHaveBeenCalledWith("agent", "agent", f.options);
  expect(f.mutation.upsert).toHaveBeenCalledWith(
    [
      {
        package_id: packageId,
        kind: "agent",
        resource_id: "agent",
        name: "Agent",
      },
    ],
    { onConflict: "package_id,kind,resource_id" },
  );
  resource.mockRejectedValueOnce(new Error("NOT_AUTHORIZED"));
  const denied = setup();
  await expect(
    addXRAGPackageItem(input, denied.options as any),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(denied.mutation.upsert).not.toHaveBeenCalled();
});
it.each([
  addXRAGPackageItem,
  removeXRAGPackageItem,
  deleteXRAGPackage,
  exportXRAGPackage,
])("rejects an unavailable package before mutation", async (operation) => {
  const f = setup({ packages: [] });
  await expect(operation(input, f.options as any)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(f.mutation.delete).not.toHaveBeenCalled();
  expect(f.mutation.upsert).not.toHaveBeenCalled();
});
it("removes only the selected item and deletes only owned package metadata", async () => {
  const f = setup();
  await removeXRAGPackageItem(input, f.options as any);
  expect(f.mutation.eq.mock.calls).toEqual([
    ["package_id", packageId],
    ["kind", "agent"],
    ["resource_id", "agent"],
  ]);
  const g = setup();
  await deleteXRAGPackage(input, g.options as any);
  expect(g.mutation.eq.mock.calls).toEqual([
    ["id", packageId],
    ["owner_id", "owner"],
  ]);
});
it.each([
  listXRAGPackages,
  createXRAGPackage,
  addXRAGPackageItem,
  removeXRAGPackageItem,
  deleteXRAGPackage,
])("sanitizes database errors", async (operation) => {
  const f = setup({ error: { message: "secret" } });
  const promise =
    operation === listXRAGPackages
      ? operation(f.options as any)
      : (operation as any)({ ...input, name: "Demo" }, f.options);
  await expect(promise).rejects.not.toThrow("secret");
});
it("rejects empty packages before writing archives", async () => {
  const f = setup();
  await expect(exportXRAGPackage(input, f.options as any)).rejects.toThrow(
    "XRAG_PACKAGE_SIZE",
  );
});

it.each([
  ["XRAG_PACKAGE_ADD_FAILED", addXRAGPackageItem],
  ["XRAG_PACKAGE_REMOVE_FAILED", removeXRAGPackageItem],
  ["XRAG_PACKAGE_DELETE_FAILED", deleteXRAGPackage],
] as const)(
  "reports a failed write to an authorized package as %s",
  async (expected, operation) => {
    const f = setup({ mutationError: { message: "private database detail" } });
    await expect(operation(input, f.options as any)).rejects.toThrow(expected);
    expect(f.list.eq).toHaveBeenCalledWith("owner_id", "owner");
  },
);

it("adds explicitly selected related objects in one deduplicated write", async () => {
  const f = setup();
  relatedObjects.mockResolvedValue([
    { kind: "documentRepository", id: "docs", name: "Files" },
    { kind: "transcriber", id: "transcriber", name: "Speech" },
    { kind: "model", id: "model", name: "Model" },
  ]);
  await addXRAGPackageItem(
    {
      ...input,
      related: [
        { kind: "documentRepository", id: "docs" },
        { kind: "documentRepository", id: "docs" },
        { kind: "transcriber", id: "transcriber" },
      ],
    },
    f.options as any,
  );
  expect(f.mutation.upsert).toHaveBeenCalledTimes(1);
  expect(f.mutation.upsert.mock.calls[0][0]).toEqual([
    {
      package_id: packageId,
      kind: "agent",
      resource_id: "agent",
      name: "Agent",
    },
    {
      package_id: packageId,
      kind: "documentRepository",
      resource_id: "docs",
      name: "Files",
    },
    {
      package_id: packageId,
      kind: "transcriber",
      resource_id: "transcriber",
      name: "Speech",
    },
  ]);
});
it("rejects revoked, removed or fabricated dependencies before writing any selection", async () => {
  const f = setup();
  relatedObjects.mockResolvedValue([]);
  await expect(
    addXRAGPackageItem(
      { ...input, related: [{ kind: "model", id: "unrelated" }] },
      f.options as any,
    ),
  ).rejects.toThrow("XRAG_REFERENCE_UNAVAILABLE");
  expect(f.mutation.upsert).not.toHaveBeenCalled();
});
