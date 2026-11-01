import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  access: vi.fn(),
  inspect: vi.fn(),
  content: vi.fn(),
  signed: vi.fn(),
  relay: vi.fn(),
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    storage: { from: () => ({ createSignedUrl: state.signed }) },
  }),
}));
vi.mock("@/lib/storageDownloadResponse", () => ({
  storageDownloadResponse: state.relay,
}));
vi.mock(
  "@schornio/aibox-package-database/storage/requireStorageAccess",
  () => ({ requireStorageAccess: state.access }),
);
vi.mock("@schornio/aibox-package-database/storage/inspect", () => ({
  inspect: state.inspect,
}));
vi.mock("@schornio/aibox-package-database/storage/getDocumentContent", () => ({
  getDocumentContent: state.content,
}));
import { GET } from "../../apps/web/app/api/storage-file/download/route";
const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
};
const request = (format = "original", path = "file.txt") =>
  new Request(
    `http://localhost/api/storage-file/download?${new URLSearchParams({ storage: JSON.stringify(storage), path, format })}`,
  );
beforeEach(() => {
  vi.resetAllMocks();
  state.inspect.mockResolvedValue({
    file: true,
    name: "file.txt",
    path: "file.txt",
  });
  state.signed.mockResolvedValue({
    data: { signedUrl: "https://signed.test" },
  });
  state.relay.mockResolvedValue(
    new Response("original", { headers: { "Content-Type": "text/plain" } }),
  );
  state.content.mockResolvedValue({
    type: "mdc",
    current: "processed",
    versions: [],
  });
});
it("authorizes original downloads and provides a private attachment response", async () => {
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("original");
  expect(response.headers.get("content-disposition")).toContain("attachment;");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(state.access).toHaveBeenCalledWith(
    storage,
    "read",
    expect.any(Object),
  );
  expect(state.signed).toHaveBeenCalledWith("workspace/repo/file.txt", 60);
});
it("exports processed text separately without downloading the original", async () => {
  const response = await GET(request("processed"));
  expect(await response.text()).toBe("processed");
  expect(response.headers.get("content-disposition")).toContain("file.txt.md");
  expect(state.signed).not.toHaveBeenCalled();
});
it("uses corrected transcription text in processed downloads", async () => {
  state.content.mockResolvedValue({
    type: "transcript",
    segments: [{ segmentOverride: "Corrected", words: [] }],
  });
  expect(await (await GET(request("processed"))).text()).toBe("Corrected");
});
it("does not sign an inaccessible file", async () => {
  state.access.mockRejectedValue(new Error("denied"));
  expect((await GET(request())).status).toBe(404);
  expect(state.signed).not.toHaveBeenCalled();
});
it("rejects folder, traversal and missing processed content", async () => {
  expect((await GET(request("original", "../escape"))).status).toBe(404);
  state.inspect.mockResolvedValue({ folder: true });
  expect((await GET(request())).status).toBe(404);
  state.inspect.mockResolvedValue({ file: true, name: "file.txt" });
  state.content.mockResolvedValue(undefined);
  expect((await GET(request("processed"))).status).toBe(404);
});
