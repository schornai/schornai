import { beforeEach, expect, it, vi } from "vitest";
const io = vi.hoisted(() => ({
  exchange: vi.fn(),
  grant: vi.fn(),
  client: {},
}));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => io.client,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/exchangeCode", () => ({
  exchangeCode: io.exchange,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/getGrant", () => ({
  getGrant: io.grant,
}));
import { POST } from "../apps/web/app/api/platform-mcp/token/route";
import { hashCredential } from "../apps/web/lib/platformMcp/oauth";
const fields = {
  grant_type: "authorization_code",
  client_id: "11111111-1111-4111-8111-111111111111",
  code: "a".repeat(43),
  code_verifier: "b".repeat(43),
  redirect_uri: "https://client.test/callback",
  resource: "https://box.test/mcp",
};
const request = (values = fields) =>
  new Request("https://box.test/api/platform-mcp/token", {
    method: "POST",
    body: new URLSearchParams(values),
  });
beforeEach(() => {
  vi.clearAllMocks();
  io.exchange.mockResolvedValue(true);
  io.grant.mockResolvedValue({ access_level: "editor" });
});
it.each(["user", "editor", "workspace", "admin"])(
  "reports the consented %s scope rather than requested scope",
  async (scope) => {
    io.grant.mockResolvedValue({ access_level: scope });
    const result = await POST(request());
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toMatchObject({
      scope,
      token_type: "Bearer",
      expires_in: 3600,
    });
    expect(io.exchange).toHaveBeenCalledWith(
      expect.objectContaining({
        p_resource: fields.resource,
        p_challenge: hashCredential(fields.code_verifier),
        p_access_hash: hashCredential(body.access_token),
      }),
      { supabase: io.client },
    );
    expect(io.grant).toHaveBeenCalledWith(
      hashCredential(body.access_token),
      fields.resource,
      { supabase: io.client },
    );
  },
);
it("does not return a token for failed PKCE, expired or replayed codes", async () => {
  io.exchange.mockResolvedValue(false);
  expect(await (await POST(request())).json()).toEqual({
    error: "invalid_grant",
  });
  expect(io.grant).not.toHaveBeenCalled();
});
it("does not return a token if its grant was concurrently revoked", async () => {
  io.grant.mockResolvedValue(null);
  expect(await (await POST(request())).json()).toEqual({
    error: "invalid_grant",
  });
});
it("sanitizes exchange failures and rejects unsupported grants", async () => {
  io.exchange.mockRejectedValue(new Error("private"));
  expect(await (await POST(request())).json()).toEqual({
    error: "invalid_request",
  });
  expect(
    (await POST(request({ ...fields, grant_type: "refresh_token" }))).status,
  ).toBe(400);
});
