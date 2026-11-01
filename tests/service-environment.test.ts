import { expect, it } from "vitest";
import { configSchema, type Context } from "../packages/service/src/config.ts";
import {
  connectionEnvironment,
  workerRealtimeUrl,
} from "../packages/service/src/environment.ts";
import { serviceCommands } from "../packages/service/src/serviceCommands.ts";

function context(services: string[], endpoints = {}): Context {
  return {
    root: "/tmp/service-environment",
    configPath: "/tmp/service-environment/config.json",
    config: configSchema.parse({
      version: 1,
      id: "00000000-0000-4000-8000-000000000001",
      services,
      endpoints,
      sharing: { url: "https://core.example" },
    }),
    environment: {
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SECRET_KEY: "sb_secret_test",
    },
  };
}

it.each(["https://database.example", "https://project.supabase.co"])(
  "keeps API keys separate from the signing secret for %s",
  (supabase) => {
    const current = context(["core"], { supabase });
    const plan = serviceCommands(current);
    expect(plan.compose.map((entry) => entry.spec.name)).toEqual(["core"]);
    expect(plan.compose[0]!.services).toEqual(["web", "realtimeyjs", "proxy"]);
    expect(plan.compose[0]!.spec.env).toMatchObject({
      SUPABASE_URL: supabase,
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SECRET_KEY: "sb_secret_test",
    });
    const native = connectionEnvironment(current, current.environment, "host");
    expect(native.SUPABASE_URL).toBe(supabase);
    expect(native.SUPABASE_ANON_KEY).toBe("sb_publishable_test");
    expect(native.SUPABASE_SERVICE_ROLE_KEY).toBe("sb_secret_test");
    expect(native.SUPABASE_JWT_SECRET).toBeUndefined();
  },
);

it("passes the legacy signing secret to Core and native worker environments", () => {
  const current = context(["core", "supabase"]);
  current.environment.JWT_SECRET = "legacy-worker-signing-secret";
  const core = serviceCommands(current).compose.find(
    (entry) => entry.spec.name === "core",
  );
  expect(core?.spec.env.SUPABASE_JWT_SECRET).toBe(
    "legacy-worker-signing-secret",
  );
  expect(
    connectionEnvironment(current, current.environment, "host")
      .SUPABASE_JWT_SECRET,
  ).toBe("legacy-worker-signing-secret");
});

it.each(["host", "container"] as const)(
  "prefers an explicit worker signing secret for %s",
  (target) => {
    const current = context(["core"]);
    expect(
      connectionEnvironment(
        current,
        {
          ...current.environment,
          JWT_SECRET: "legacy-secret",
          SUPABASE_JWT_SECRET: "explicit-secret",
        },
        target,
      ).SUPABASE_JWT_SECRET,
    ).toBe("explicit-secret");
  },
);

it("resolves local Supabase addresses by execution context and lets an explicit endpoint win", () => {
  const current = context(["core", "supabase"]);
  expect(connectionEnvironment(current, {}, "container").SUPABASE_URL).toBe(
    "http://kong:8000",
  );
  expect(connectionEnvironment(current, {}, "host").SUPABASE_URL).toBe(
    "http://127.0.0.1:8085",
  );
  current.config.development = { workspace: "/tmp/checkout" };
  expect(connectionEnvironment(current, {}, "host").SUPABASE_URL).toBe(
    "http://127.0.0.1:54321",
  );
  current.config.endpoints.supabase = "https://other.supabase.co";
  expect(
    connectionEnvironment(current, { SUPABASE_URL: "http://stale" }, "host")
      .SUPABASE_URL,
  ).toBe("https://other.supabase.co");
});

it("keeps legacy keys usable while preferring canonical key names", () => {
  const current = context([]);
  expect(
    connectionEnvironment(
      current,
      { ANON_KEY: "legacy-anon", SERVICE_ROLE_KEY: "legacy-service" },
      "host",
    ),
  ).toMatchObject({
    SUPABASE_PUBLISHABLE_KEY: "legacy-anon",
    SUPABASE_SECRET_KEY: "legacy-service",
  });
  expect(
    connectionEnvironment(
      current,
      { ...current.environment, ANON_KEY: "old", SERVICE_ROLE_KEY: "old" },
      "host",
    ),
  ).toMatchObject({
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    SUPABASE_SECRET_KEY: "sb_secret_test",
  });
});

it("selects document extraction independently and routes Core to a remote extractor", () => {
  const extractor = serviceCommands(context(["document-extractor"]));
  expect(extractor.native).toEqual([]);
  expect(extractor.compose.map((entry) => entry.services)).toEqual([
    ["document-extractor"],
  ]);
  const core = serviceCommands(
    context(["core"], {
      supabase: "https://db.example",
      documentExtractor: "http://10.0.0.5:9998",
    }),
  );
  expect(core.compose[0]!.spec.env.DOCUMENT_EXTRACTOR_URL).toBe(
    "http://10.0.0.5:9998",
  );
});

it("uses the single Core sharing URL for a remote worker and loopback for colocated workers", () => {
  const current = context(["transcriber-mlx"]);
  expect(workerRealtimeUrl(current, {})).toBe(
    "https://core.example/v2/realtime",
  );
  current.config.services.push("core");
  expect(workerRealtimeUrl(current, {})).toBe("http://127.0.0.1:9001");
  current.config.endpoints.realtime = "https://explicit.example/v2/realtime";
  expect(workerRealtimeUrl(current, {})).toBe(
    "https://explicit.example/v2/realtime",
  );
});
