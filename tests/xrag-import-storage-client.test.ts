import { afterEach, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import { createImportStorageClient } from "../packages/database/src/xrag/createImportStorageClient.ts";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("uses a short-lived signed attempt subject for Storage's internal completion transaction", async () => {
  const secret = "test-only-import-signing-secret";
  vi.stubEnv("SUPABASE_URL", "https://storage.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-api-key");
  vi.stubEnv("SUPABASE_JWT_SECRET", secret);
  const fetch = vi.fn(async (_input: unknown, init: RequestInit) => {
    const token = new Headers(init.headers)
      .get("Authorization")!
      .slice("Bearer ".length);
    const verified = await jwtVerify(token, new TextEncoder().encode(secret));
    expect(verified.payload).toMatchObject({
      role: "service_role",
      sub: "attempt",
      xrag_import_id: "import",
      xrag_import_token: "attempt",
    });
    expect(verified.payload.exp! - Date.now() / 1000).toBeGreaterThan(590);
    expect(verified.payload.exp! - Date.now() / 1000).toBeLessThanOrEqual(600);
    return new Response(JSON.stringify({}), { status: 200 });
  });
  vi.stubGlobal("fetch", fetch);
  await createImportStorageClient("import", "attempt")
    .storage.from("xrag-import-staging")
    .remove(["import/new/0"]);
  expect(fetch).toHaveBeenCalledOnce();
});
