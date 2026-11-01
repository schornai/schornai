import { describe, expect, it } from "vitest";
import { serviceCommands } from "../packages/service/src/serviceCommands.ts";
import { configSchema } from "../packages/service/src/config.ts";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const context = (services: string[]) => ({
  config: configSchema.parse({
    version: 1,
    id: "00000000-0000-4000-8000-000000000001",
    services,
    endpoints: {
      supabase: "https://database.example",
      realtime: "https://web.example/v2/realtime",
    },
    caFile: "ca.pem",
  }),
  root: "/tmp/service-test",
  configPath: "/tmp/service-test/config.json",
  environment: {
    ANON_KEY: "anon-test",
    SERVICE_ROLE_KEY: "service-test",
    JWT_SECRET: "jwt-test",
    REALTIME_SERVER_SECRET: "realtime-test",
  },
});
describe("service service isolation", () => {
  it.each([[], ["supabase"], ["core"], ["ollama"], ["document-extractor"]])(
    "starts only the selected service group %s",
    (...input) => {
      const services = input as string[];
      const plan = serviceCommands(context(services));
      expect(plan.native.map((item) => item.name)).toEqual(
        services.includes("ollama") ? ["ollama"] : [],
      );
      expect(plan.compose.map((item) => item.spec.name)).toEqual(
        services.includes("supabase")
          ? ["supabase"]
          : services.includes("core")
            ? ["core"]
            : services.includes("document-extractor")
              ? ["document-extractor"]
              : [],
      );
    },
  );
  it.skipIf(process.platform !== "darwin" || process.arch !== "arm64")(
    "passes remote endpoints, unique identity and the CA to a transcriber-mlx without Docker",
    () => {
      const plan = serviceCommands(context(["transcriber-mlx"]));
      expect(plan.compose).toEqual([]);
      expect(plan.native).toHaveLength(1);
      expect(plan.native[0]?.env).toMatchObject({
        SUPABASE_URL: "https://database.example",
        REALTIME_SERVER_URL: "https://web.example/v2/realtime",
        WORKER_IDENTIFIER:
          "00000000-0000-4000-8000-000000000001:transcriber-mlx",
        NODE_EXTRA_CA_CERTS: "/tmp/service-test/ca.pem",
        SUPABASE_JWT_SECRET: "jwt-test",
        SUPABASE_ANON_KEY: "anon-test",
        SUPABASE_SERVICE_ROLE_KEY: "service-test",
      });
    },
  );
  it("rejects conflicting and unknown services", () => {
    expect(() => context(["database", "supabase"])).toThrow();
    expect(() => context(["typo"])).toThrow();
  });
  it.skipIf(process.platform !== "darwin" || process.arch !== "arm64")(
    "uses the existing local endpoints and certificate for a complete box without overriding container addresses",
    async () => {
      const current = context([
        "supabase",
        "core",
        "ollama",
        "transcriber-mlx",
      ]);
      current.config.endpoints = {};
      current.config.caFile = undefined;
      current.root = await mkdtemp(join(tmpdir(), "service-local-endpoints-"));
      try {
        const cert = join(current.root, "docker/volumes/api/cert/fullkey.pem");
        await mkdir(join(current.root, "docker/volumes/api/cert"), {
          recursive: true,
        });
        await writeFile(cert, "existing certificate");
        const plan = serviceCommands(current);
        expect(
          plan.native.find((item) => item.name === "transcriber-mlx")?.env,
        ).toMatchObject({
          SUPABASE_URL: "http://127.0.0.1:8085",
          REALTIME_SERVER_URL: "http://127.0.0.1:9001",
          NODE_EXTRA_CA_CERTS: cert,
        });
        for (const item of plan.compose) {
          expect(item.spec.env.SUPABASE_URL).toBe("http://kong:8000");
          expect(item.spec.env.REALTIME_SERVER_URL).toBeUndefined();
        }
      } finally {
        await rm(current.root, { recursive: true, force: true });
      }
    },
  );
});
