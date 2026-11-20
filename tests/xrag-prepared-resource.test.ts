import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { readPreparedResource } from "../packages/database/src/xrag/readPreparedResource.ts";
const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it.each([
  "missing-source",
  "signed-url",
  "http",
  "empty-body",
  "oversize",
  "truncated",
])("rejects unavailable or damaged selected children: %s", async (phase) => {
  const root = await mkdtemp(join(tmpdir(), "xrag-read-test-"));
  roots.push(root);
  const archive = {
    id: "a".repeat(64),
    size: 3,
    source:
      phase === "missing-source"
        ? undefined
        : { bucket: "xrag-prepared", path: "child.tar" },
  };
  const signed =
    phase === "signed-url"
      ? { data: null, error: new Error("private") }
      : { data: { signedUrl: "https://storage.test/child" }, error: null };
  const options = {
    supabaseServiceRole: {
      storage: { from: () => ({ createSignedUrl: async () => signed }) },
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      phase === "http"
        ? new Response("missing", { status: 404 })
        : phase === "empty-body"
          ? new Response(null)
          : new Response(phase === "oversize" ? "long" : "x"),
    ),
  );
  await expect(
    readPreparedResource(archive as any, root, options as any),
  ).rejects.toThrow(
    phase === "oversize"
      ? "XRAG_ARCHIVE_LIMIT"
      : phase === "truncated"
        ? "XRAG_CHECKSUM_MISMATCH"
        : "XRAG_TRANSFER_UNAVAILABLE",
  );
});
