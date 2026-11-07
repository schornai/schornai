import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ register: vi.fn(), client: {} }));
vi.mock("@/lib/supabase/createSupabaseServiceRoleClient", () => ({
  createSupabaseServiceRoleClient: () => mocks.client,
}));
vi.mock("@schornio/aibox-package-database/platformMcp/registerClient", () => ({
  registerClient: mocks.register,
}));
import { POST } from "../apps/web/app/api/platform-mcp/register/route";
import { MCPOAuthProvider } from "../packages/realtime/src/mcp/MCPOAuthProvider";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.register.mockResolvedValue("11111111-1111-4111-8111-111111111111");
});
const provider = new MCPOAuthProvider(
  {
    user_id: "user",
    server_url: "http://localhost:3003/mcp",
    data: { redirectUrl: "https://localhost:3000/api/mcp/oauth/callback" },
    version: "version",
    state: null,
    state_expires_at: null,
  },
  { supabase: {} as never, mcpId: "mcp" },
);
function request(metadata: unknown) {
  return new Request("http://localhost:3003/api/platform-mcp/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
}
it("registers the actual schorn.ai OAuth client while reporting only supported grants", async () => {
  expect(provider.clientMetadata.grant_types).toContain("refresh_token");
  const response = await POST(request(provider.clientMetadata));
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    client_id: "11111111-1111-4111-8111-111111111111",
    redirect_uris: [provider.redirectUrl],
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
  });
  expect(mocks.register).toHaveBeenCalledWith(
    "schorn.ai",
    [provider.redirectUrl],
    { supabase: mocks.client },
  );
});
it("does not register a client that requests only an unsupported grant", async () => {
  const response = await POST(
    request({ ...provider.clientMetadata, grant_types: ["refresh_token"] }),
  );
  expect(response.status).toBe(400);
  expect(mocks.register).not.toHaveBeenCalled();
});
it("does not expose backend errors in a registration response", async () => {
  mocks.register.mockRejectedValue(new Error("private database details"));
  const response = await POST(request(provider.clientMetadata));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "invalid_client_metadata" });
});
