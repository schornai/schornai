import { afterEach, expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import { generateSupabaseKey } from "../packages/xrag/update/scripts/generateSupabaseKey";

afterEach(() => vi.useRealTimers());

it.each([
  ["ANON_KEY", "anon"],
  ["SERVICE_ROLE_KEY", "service_role"],
] as const)(
  "creates a verifiable %s with the intended role and lifetime",
  async (type, role) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T12:00:00Z"));
    const secret = "0123456789abcdef0123456789abcdef01234567";
    const token = generateSupabaseKey(type, secret);
    const { payload, protectedHeader } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        algorithms: ["HS256"],
        issuer: "supabase",
      },
    );
    expect(protectedHeader).toEqual({ alg: "HS256", typ: "JWT" });
    expect(payload.role).toBe(role);
    expect(payload.iat).toBeLessThanOrEqual(Date.now() / 1000);
    expect(payload.exp! - payload.iat!).toBeGreaterThan(4 * 365 * 24 * 60 * 60);
    expect(payload.exp! - payload.iat!).toBeLessThan(6 * 365 * 24 * 60 * 60);
    await expect(
      jwtVerify(token, new TextEncoder().encode("wrong-secret")),
    ).rejects.toThrow();
  },
);

it("rejects weak signing keys and unknown roles", () => {
  expect(() => generateSupabaseKey("ANON_KEY", "short")).toThrow("JWT_SECRET");
  expect(() =>
    generateSupabaseKey("unexpected" as any, "a".repeat(40)),
  ).toThrow("Invalid Supabase key type");
});
