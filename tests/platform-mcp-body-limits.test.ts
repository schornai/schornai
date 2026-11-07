import { beforeEach, expect, it, vi } from "vitest";
const backend = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: backend,
}));
import { readOAuthBody } from "../apps/web/lib/platformMcp/http";
import { POST as register } from "../apps/web/app/api/platform-mcp/register/route";
import { POST as token } from "../apps/web/app/api/platform-mcp/token/route";
import { POST as revoke } from "../apps/web/app/api/platform-mcp/revoke/route";
beforeEach(() => vi.clearAllMocks());
function streamed(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  const cancel = vi.fn();
  let index = 0;
  const request = new Request("https://box.test/oauth", {
    method: "POST",
    headers,
    body: new ReadableStream({
      pull(controller) {
        if (index === chunks.length) controller.close();
        else controller.enqueue(chunks[index++]);
      },
      cancel,
    }),
    duplex: "half",
  } as RequestInit);
  return { request, cancel };
}
it("accepts exactly 32 KiB and decodes Unicode split across chunks", async () => {
  const bytes = new TextEncoder().encode("ä".repeat(16384));
  const { request } = streamed([bytes.slice(0, 1), bytes.slice(1)]);
  expect(await readOAuthBody(request)).toBe("ä".repeat(16384));
});
it("stops reading and cancels oversized streamed bodies", async () => {
  const { request, cancel } = streamed([
    new Uint8Array(32768),
    new Uint8Array(1),
    new Uint8Array(10),
  ]);
  await expect(readOAuthBody(request)).rejects.toThrow("OAUTH_BODY_TOO_LARGE");
  expect(cancel).toHaveBeenCalledOnce();
});
it("rejects a declared oversized body before reading it", async () => {
  const { request } = streamed([], { "content-length": "32769" });
  await expect(readOAuthBody(request)).rejects.toThrow("OAUTH_BODY_TOO_LARGE");
  expect(request.bodyUsed).toBe(false);
});
it("handles empty input and rejects invalid UTF-8", async () => {
  expect(await readOAuthBody(new Request("https://box.test"))).toBe("");
  await expect(
    readOAuthBody(streamed([new Uint8Array([255])]).request),
  ).rejects.toThrow();
});
for (const [name, handler] of [
  ["register", register],
  ["token", token],
  ["revoke", revoke],
] as const) {
  it.each([{}, { "content-length": "1" }])(
    `${name} rejects large bodies before privileged access with headers %j`,
    async (headers) => {
      const fields = {
        client_id: "11111111-1111-4111-8111-111111111111",
        grant_type: "authorization_code",
        code: "a".repeat(43),
        code_verifier: "b".repeat(43),
        redirect_uri: "https://client.test/callback",
        resource: "https://box.test/mcp",
        token: "c".repeat(43),
        padding: "x".repeat(32769),
      };
      const body =
        name === "register"
          ? JSON.stringify({
              client_name: "Test",
              redirect_uris: [fields.redirect_uri],
              padding: fields.padding,
            })
          : new URLSearchParams(fields).toString();
      const { request } = streamed([new TextEncoder().encode(body)], headers);
      const response = await handler(request);
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error:
          name === "register" ? "invalid_client_metadata" : "invalid_request",
      });
      expect(backend).not.toHaveBeenCalled();
    },
  );
}
