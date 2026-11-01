import { expect, it, vi } from "vitest";
import { jwtVerify } from "jose";
import { prepareTranscriberEnvironment } from "../packages/utils/src/prepareTranscriberEnvironment";
import { createClientWithClaims } from "../packages/database/src/auth/createClientWithClaims";

const environment = {
  SUPABASE_URL: "http://supabase.test",
  SUPABASE_ANON_KEY: "public-test",
  SUPABASE_SERVICE_ROLE_KEY: "private-test",
  REALTIME_SERVER_URL: "ws://realtime.test",
  REALTIME_SERVER_SECRET: "realtime-test",
  JWT_SECRET: "legacy-signing-secret",
};
it.each([undefined, "explicit-signing-secret"])(
  "signs storage requests with user claims using %s or JWT_SECRET",
  async (explicit) => {
    const resolved = prepareTranscriberEnvironment({
      ...environment,
      SUPABASE_JWT_SECRET: explicit,
    });
    for (const [key, value] of Object.entries(resolved)) vi.stubEnv(key, value);
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ Key: "bucket/transcript.json" }), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const claims = [{ organization_id: "workspace", role: "editor" }];
    const client = await createClientWithClaims("user-one", claims as any);
    const { error } = await client.storage
      .from("bucket")
      .upload("transcript.json", "transcript");
    expect(error).toBeNull();
    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    const token = headers.get("Authorization")!.replace(/^Bearer /, "");
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(explicit ?? environment.JWT_SECRET),
    );
    expect(payload).toMatchObject({
      sub: "user-one",
      role: "authenticated",
      organization_roles: claims,
    });
    expect(headers.get("apikey")).toBe("public-test");
  },
);
it("reports missing configuration without exposing values or mutating input", () => {
  const missing = { ...environment, JWT_SECRET: undefined, SUPABASE_URL: "" };
  expect(() => prepareTranscriberEnvironment(missing)).toThrow(
    "missing SUPABASE_URL, SUPABASE_JWT_SECRET",
  );
  expect(() => prepareTranscriberEnvironment(missing)).not.toThrow(
    "private-test",
  );
  expect(environment).not.toHaveProperty("SUPABASE_JWT_SECRET");
});
