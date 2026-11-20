import { expect, it, vi } from "vitest";
vi.mock("@schornio/aibox-package-database/xrag/getPreparedXRAGImport", () => ({
  getPreparedXRAGImport: async () => ({ digest: "prepared" }),
}));
const state = vi.hoisted(() => ({
  packages: vi.fn(() => []),
  jobs: vi.fn(() => []),
  authorize: vi.fn(),
  workspaces: vi.fn(() => ({
    isAdmin: false,
    claims: [
      { id: "a", name: "One", claim: "workspace-admin" },
      { id: "b", name: "Two", claim: "user" },
    ],
  })),
}));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw Error(p);
  },
  notFound: () => {
    throw Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({ auth: {} }),
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUser", () => ({
  getCurrentUser: async () => ({ id: "caller" }),
}));
vi.mock("@schornio/aibox-package-database/user/getCurrentUserClaims", () => ({
  getCurrentUserClaims: async () => [],
}));
vi.mock("@schornio/aibox-package-database/mcp/platformAccess", () => ({
  requirePlatformAccess: state.authorize,
}));
vi.mock("@schornio/aibox-package-database/xrag/listXRAGPackages", () => ({
  listXRAGPackages: state.packages,
}));
vi.mock("@schornio/aibox-package-database/xrag/listXRAGExportJobs", () => ({
  listXRAGExportJobs: state.jobs,
}));
vi.mock("@/lib/groupSortView/model", () => ({
  getGroupSortViewPreferences: async () => ({ view: "table" }),
}));
vi.mock("../../apps/web/app/_models/getWorkspaceClaims", () => ({
  getWorkspaceClaims: state.workspaces,
}));
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_components/XRAGImportExport",
  () => ({ XRAGImportExport: () => null }),
);
vi.mock(
  "../../apps/web/app/(main)/app/xrag/_components/XRAGImportUpload",
  () => ({ XRAGImportUpload: () => null }),
);
vi.mock("../../apps/web/app/(main)/app/xrag/_components/XRAGTransfer", () => ({
  XRAGTransfer: () => null,
}));
vi.mock("../../apps/web/app/(main)/app/xrag/_components/XRAGPackages", () => ({
  XRAGPackages: () => null,
}));
import Root from "../../apps/web/app/(main)/app/xrag/page";
import Upload from "../../apps/web/app/(main)/app/xrag/import/page";
import Selection from "../../apps/web/app/(main)/app/xrag/import/[id]/page";
import Export from "../../apps/web/app/(main)/app/xrag/export/page";
it("opens the upload page from the XRAG entry point", () =>
  expect(() => Root()).toThrow("/app/xrag/import"));
it("loads export data only on the export route", async () => {
  const upload = await Upload();
  expect(upload.props.tab).toBe("import");
  expect(upload.props.children.props.userId).toBe("caller");
  expect(state.packages).not.toHaveBeenCalled();
  const page = await Export();
  expect(page.props.tab).toBe("export");
  expect(state.jobs).toHaveBeenCalledOnce();
  expect(state.packages).toHaveBeenCalledOnce();
});
it("validates upload IDs and passes only administrable workspaces to the selection", async () => {
  await expect(
    Selection({ params: Promise.resolve({ id: "invalid" }) }),
  ).rejects.toThrow("NOT_FOUND");
  const id = "11111111-1111-4111-8111-111111111111";
  const page = await Selection({ params: Promise.resolve({ id }) });
  expect(page.props).toMatchObject({
    uploadId: id,
    prepared: { digest: "prepared" },
    preferences: { view: "table" },
    workspaces: [{ id: "a", name: "One" }],
  });
  expect(state.authorize).toHaveBeenCalledWith([], "admin", "workspace");
});
