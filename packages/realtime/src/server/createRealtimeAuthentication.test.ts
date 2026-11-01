import { describe, expect, it, vi } from "vitest";
import { createRealtimeAuthentication } from "./createRealtimeAuthentication.ts";
import type {
  onAuthenticatePayload,
  connectedPayload,
  onDisconnectPayload,
} from "@hocuspocus/server";

const secret = "a-unique-server-secret-with-at-least-32-characters";
const payload = (token: string, documentName = "taskQueue") =>
  ({
    token,
    documentName,
    connectionConfig: { readOnly: false, isAuthenticated: false },
  }) as onAuthenticatePayload;

describe("realtime authentication", () => {
  it.each([
    "",
    "todo",
    "Worker TODO",
    "Worker Worker " + secret,
    "Worker DANGER_UNSAFE_TODO_REPLACE",
    "User ",
    "User bad token",
  ])("rejects malformed and old credentials: %s", async (token) => {
    const authorizeUser = vi.fn().mockResolvedValue(undefined);
    const auth = createRealtimeAuthentication({ secret, authorizeUser });
    const data = payload(token);
    await expect(auth.onAuthenticate!(data)).rejects.toThrow("Unauthorized");
    expect(data.connectionConfig.readOnly).toBe(true);
  });
  it("allows the exact server secret without user authorization", async () => {
    const authorizeUser = vi.fn();
    const auth = createRealtimeAuthentication({ secret, authorizeUser });
    const data = payload(`Worker ${secret}`);
    const context = await auth.onAuthenticate!(data);
    expect(context.authorization.worker).toBe(true);
    expect(data.connectionConfig.readOnly).toBe(false);
    expect(authorizeUser).not.toHaveBeenCalled();
  });
  it("checks the user token and individual document with read-only enforcement", async () => {
    const authorizeUser = vi.fn().mockResolvedValue({
      permission: "read",
      expiresAt: Date.now() + 60_000,
    });
    const auth = createRealtimeAuthentication({ secret, authorizeUser });
    const data = payload("User signed-jwt", "activity___own-user");
    await auth.onAuthenticate!(data);
    expect(authorizeUser).toHaveBeenCalledWith(
      "signed-jwt",
      "activity___own-user",
    );
    expect(data.connectionConfig.readOnly).toBe(true);
  });
  it.each([undefined, { permission: "read", expiresAt: 0 }])(
    "denies absent/expired document authorization",
    async (authorization) => {
      const auth = createRealtimeAuthentication({
        secret,
        authorizeUser: vi.fn().mockResolvedValue(authorization),
      });
      await expect(auth.onAuthenticate!(payload("User jwt"))).rejects.toThrow(
        "Unauthorized",
      );
    },
  );
  it("allows only authorized draft editing", async () => {
    const auth = createRealtimeAuthentication({
      secret,
      authorizeUser: vi.fn().mockResolvedValue({
        permission: "read_write",
        expiresAt: Date.now() + 60_000,
      }),
    });
    const data = payload(
      "User jwt",
      "activity_chat_currentMessage___authorized",
    );
    await auth.onAuthenticate!(data);
    expect(data.connectionConfig.readOnly).toBe(false);
  });
  it("disconnects idle clients at token expiry and cleans up timers", async () => {
    vi.useFakeTimers();
    const authorizeUser = vi
      .fn()
      .mockResolvedValue({ permission: "read", expiresAt: Date.now() + 500 });
    const auth = createRealtimeAuthentication({ secret, authorizeUser });
    const data = payload("User jwt");
    const context = await auth.onAuthenticate!(data);
    const connection = { close: vi.fn(), readOnly: true };
    await auth.connected!({
      ...data,
      context,
      connection,
    } as unknown as connectedPayload);
    await vi.advanceTimersByTimeAsync(500);
    expect(connection.close).toHaveBeenCalledWith({
      code: 4401,
      reason: "Unauthorized",
    });
    await auth.onDisconnect!({ context } as onDisconnectPayload);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects a short or absent configured worker secret", () => {
    expect(() =>
      createRealtimeAuthentication({ secret: "short", authorizeUser: vi.fn() }),
    ).toThrow("Invalid realtime server secret");
  });
});

it("scopes machine credentials to read-only artifact/status rooms", async () => {
  const serviceSecret = "machine-sharing-secret-with-at-least-32-characters";
  const id = "00000000-0000-4000-8000-000000000001";
  const auth = createRealtimeAuthentication({
    secret,
    serviceSecret,
    authorizeUser: vi.fn(),
  });
  for (const name of ["services", "artifactCatalog"]) {
    const data = payload(`Service ${id} ${serviceSecret}`, name);
    const context = await auth.onAuthenticate!(data);
    expect(data.connectionConfig.readOnly).toBe(true);
    expect(context.authorization.serviceId).toBe(id);
  }
  for (const name of [
    "taskQueue",
    "activity___another-user",
    "services/other",
  ]) {
    await expect(
      auth.onAuthenticate!(payload(`Service ${id} ${serviceSecret}`, name)),
    ).rejects.toThrow("Unauthorized");
  }
  await expect(
    auth.onAuthenticate!(payload(`Service ${id} incorrect`, "services")),
  ).rejects.toThrow("Unauthorized");
});
