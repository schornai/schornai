import { describe, expect, it, vi } from "vitest";
import { database } from "./helpers/supabase";
import { createGrant } from "../packages/database/src/platformMcp/createGrant";
import { exchangeCode } from "../packages/database/src/platformMcp/exchangeCode";
import { refreshTokens } from "../packages/database/src/platformMcp/refreshTokens";
import { revokeGrant } from "../packages/database/src/platformMcp/revokeGrant";
import { getClient } from "../packages/database/src/platformMcp/getClient";
import { getGrant } from "../packages/database/src/platformMcp/getGrant";
import { registerClient } from "../packages/database/src/platformMcp/registerClient";

const privateError = {
  message: "private credential details",
  details: "secret",
};
describe("platform OAuth database boundaries", () => {
  it.each([
    null,
    {
      id: "client",
      name: "Desktop",
      redirect_uris: ["https://client.test/callback"],
    },
  ])("returns public registration metadata or absence", async (data) => {
    const db = database({ platform_mcp_clients: { data } });
    expect(await getClient("client", db as any)).toEqual(data);
    expect(
      db.builders.platform_mcp_clients.select,
    ).toHaveBeenCalledExactlyOnceWith("id,name,redirect_uris");
    expect(db.builders.platform_mcp_clients.eq).toHaveBeenCalledExactlyOnceWith(
      "id",
      "client",
    );
  });
  it.each([null, { id: "grant", user_id: "user" }])(
    "binds bearer lookup to its hash, resource and unexpired lifetime",
    async (data) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
      const db = database({ platform_mcp_grants: { data } });
      const builder = db.builders.platform_mcp_grants;
      builder.gt = vi.fn(() => builder);
      expect(
        await getGrant("hashed-token", "https://box.test/mcp", db as any),
      ).toEqual(data);
      expect(builder.eq.mock.calls).toEqual([
        ["access_hash", "hashed-token"],
        ["resource", "https://box.test/mcp"],
      ]);
      expect(builder.gt).toHaveBeenCalledExactlyOnceWith(
        "access_expires_at",
        "2026-11-07T12:00:00.000Z",
      );
      expect(builder.select.mock.calls[0][0]).not.toMatch(/hash|secret/);
    },
  );
  it("registers only public metadata and returns the identifier", async () => {
    const db = database({ platform_mcp_clients: { data: { id: "client" } } });
    expect(
      await registerClient(
        "Desktop",
        ["https://client.test/callback"],
        db as any,
      ),
    ).toBe("client");
    expect(db.builders.platform_mcp_clients.insert).toHaveBeenCalledWith({
      name: "Desktop",
      redirect_uris: ["https://client.test/callback"],
    });
    expect(db.builders.platform_mcp_clients.select).toHaveBeenCalledWith("id");
  });
  it("persists the exact consent grant", async () => {
    const db = database({ platform_mcp_grants: { error: null } });
    const grant = {
      user_id: "user",
      client_id: "client",
      access_level: "editor",
      resource: "https://box.test/mcp",
      code_hash: "hashed-code",
    } as any;
    await expect(createGrant(grant, db as any)).resolves.toBeUndefined();
    expect(
      db.builders.platform_mcp_grants.insert,
    ).toHaveBeenCalledExactlyOnceWith(grant);
  });
  it.each([
    [exchangeCode, "exchange_platform_mcp_tokens", "MCP_TOKEN_EXCHANGE_FAILED"],
    [refreshTokens, "refresh_platform_mcp_tokens", "MCP_TOKEN_REFRESH_FAILED"],
  ] as const)(
    "delegates credential transactions to %s and sanitizes failures",
    async (operation, rpcName, errorCode) => {
      const input = {
        p_client_id: "client",
        p_resource: "https://box.test/mcp",
      } as any;
      const supabase = {
        rpc: vi
          .fn()
          .mockResolvedValue({ data: [{ id: "grant" }], error: null }),
      };
      await expect(operation(input, { supabase } as any)).resolves.toEqual([
        { id: "grant" },
      ]);
      expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith(rpcName, input);
      supabase.rpc.mockResolvedValue({ data: null, error: privateError });
      await expect(operation(input, { supabase } as any)).rejects.toThrow(
        new Error(errorCode),
      );
    },
  );
  it("revokes only a token belonging to the given client and sanitizes failures", async () => {
    const supabase = { rpc: vi.fn().mockResolvedValue({ error: null }) };
    await expect(
      revokeGrant("hash", "client", { supabase } as any),
    ).resolves.toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledExactlyOnceWith(
      "revoke_platform_mcp_grant",
      { p_token_hash: "hash", p_client_id: "client" },
    );
    supabase.rpc.mockResolvedValue({ error: privateError });
    await expect(
      revokeGrant("hash", "client", { supabase } as any),
    ).rejects.toThrow(new Error("MCP_REVOCATION_FAILED"));
  });
  it.each([
    [
      "client lookup",
      "platform_mcp_clients",
      (db: any) => getClient("client", db),
      "MCP_CLIENT_LOOKUP_FAILED",
    ],
    [
      "registration",
      "platform_mcp_clients",
      (db: any) => registerClient("Desktop", [], db),
      "MCP_CLIENT_REGISTRATION_FAILED",
    ],
    [
      "grant creation",
      "platform_mcp_grants",
      (db: any) => createGrant({} as any, db),
      "MCP_GRANT_FAILED",
    ],
    [
      "grant lookup",
      "platform_mcp_grants",
      (db: any) => getGrant("hash", "resource", db),
      "MCP_GRANT_LOOKUP_FAILED",
    ],
  ] as const)(
    "does not leak database details on %s failure",
    async (_name, table, operation, code) => {
      const db = database({ [table]: { error: privateError } });
      db.builders[table].gt = vi.fn(() => db.builders[table]);
      await expect(operation(db)).rejects.toThrow(new Error(code));
    },
  );
});
