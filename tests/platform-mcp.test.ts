import { describe, expect, it, vi } from "vitest";
import {
  authorizationSchema,
  hashCredential,
  newCredential,
  registrationSchema,
  validateResource,
} from "../apps/web/lib/platformMcp/oauth.ts";
import { createPlatformTools } from "../packages/realtime/src/platform/tools.ts";
import { platformAgentApprovals } from "../packages/realtime/src/platform/agentTools.ts";
import type { PlatformContext } from "../packages/realtime/src/platform/registry.ts";

const context = (
  level: PlatformContext["level"],
  claims: PlatformContext["claims"] = "admin",
) =>
  ({
    level,
    claims,
    userId: "test-user",
    supabase: {
      from: vi.fn(() => {
        throw new Error("Database should not be called");
      }),
    },
  }) as unknown as PlatformContext;

describe("platform MCP catalog", () => {
  it("inherits tools and exposes object JSON schemas", () => {
    let previous: string[] = [];
    for (const level of ["user", "editor", "workspace", "admin"] as const) {
      const tools = createPlatformTools(context(level));
      const names = tools.map((tool) => tool.name);
      expect(new Set(names).size).toBe(names.length);
      expect(names).toEqual(expect.arrayContaining(previous));
      for (const tool of tools) expect(tool.inputSchema.type).toBe("object");
      previous = names;
    }
    expect(
      createPlatformTools(context("user")).map((tool) => tool.name),
    ).not.toContain("platform_file_write");
    expect(
      createPlatformTools(context("editor")).map((tool) => tool.name),
    ).toContain("platform_file_write");
    expect(
      createPlatformTools(context("editor")).map((tool) => tool.name),
    ).not.toContain("platform_agent_create");
  });
  it("limits a higher configured level to the caller's permissions", () => {
    const tools = createPlatformTools(
      context("admin", [{ organization_id: "a", role: "editor" }]),
    );
    expect(tools.map((tool) => tool.name)).toContain("platform_file_write");
    expect(tools.map((tool) => tool.name)).not.toContain(
      "platform_workspace_create",
    );
    expect(tools.map((tool) => tool.name)).not.toContain(
      "platform_agent_create",
    );
  });
  it("rechecks role permissions before privileged operations", async () => {
    const current = context("admin");
    const tools = createPlatformTools(current);
    current.claims = [{ organization_id: "a", role: "user" }];
    await expect(
      tools
        .find((tool) => tool.name === "platform_workspace_create")!
        .execute({ name: "Injected", description: "" }),
    ).rejects.toThrow("NOT_AUTHORIZED");
  });
  it("requires chat approval for mutations", () => {
    const tools = createPlatformTools(context("admin"));
    const approvals = platformAgentApprovals(tools);
    for (const tool of tools)
      expect(approvals[tool.name as keyof typeof approvals]).toBe(
        tool.readOnly ? "approved" : "user-approval",
      );
  });
});

describe("platform OAuth inputs", () => {
  it("only accepts HTTPS or loopback redirects without fragments or credentials", () => {
    for (const uri of [
      "https://client.example/callback",
      "http://127.0.0.1:1234/callback",
    ])
      expect(
        registrationSchema.safeParse({
          client_name: "client",
          redirect_uris: [uri],
        }).success,
      ).toBe(true);
    for (const uri of [
      "http://client.example/callback",
      "https://client.example/#token",
      "https://user:pass@client.example/callback",
      "javascript:alert(1)",
    ])
      expect(
        registrationSchema.safeParse({
          client_name: "client",
          redirect_uris: [uri],
        }).success,
      ).toBe(false);
  });
  it("binds consent to the exact origin, endpoint and level", () => {
    expect(() =>
      validateResource(
        "https://example.test/mcp",
        "user",
        "https://example.test",
      ),
    ).not.toThrow();
    for (const resource of [
      "https://example.test/mcp/admin",
      "https://evil.test/mcp",
      "https://example.test/mcp?admin=1",
    ])
      expect(() =>
        validateResource(resource, "user", "https://example.test"),
      ).toThrow("INVALID_RESOURCE");
  });
  it("uses unpredictable tokens and S256 PKCE", () => {
    const a = newCredential();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newCredential()).not.toBe(a);
    expect(hashCredential("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
    expect(
      authorizationSchema.safeParse({
        client_id: crypto.randomUUID(),
        redirect_uri: "https://client.example/callback",
        response_type: "code",
        code_challenge_method: "plain",
        code_challenge: a,
        resource: "https://example.test/mcp",
        scope: "user",
        state: "state",
      }).success,
    ).toBe(false);
  });
});
