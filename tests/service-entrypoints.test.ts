import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { join } from "node:path";
import { runDaemon } from "../packages/service/src/daemon.ts";
import {
  configSchema,
  loadConfig,
  saveInitialConfig,
} from "../packages/service/src/config.ts";
import { runServiceCLI } from "../packages/service/src/cli.ts";

vi.mock("../packages/service/src/daemon.ts", () => ({ runDaemon: vi.fn() }));
vi.mock("../packages/service/src/cli.ts", () => ({ runServiceCLI: vi.fn() }));
vi.mock("../packages/service/src/config.ts", async (original) => ({
  ...(await original<typeof import("../packages/service/src/config.ts")>()),
  loadConfig: vi.fn(),
  saveInitialConfig: vi.fn(),
}));

const workspace = process.cwd();
const configuration = (services: string[] = []) => ({
  config: configSchema.parse({
    version: 1,
    id: "00000000-0000-4000-8000-000000000001",
    services,
    development: { workspace },
  }),
  root: "/test",
  configPath: "/test/config.json",
  environment: {},
});
const argv = process.argv;
const originalExitCode = process.exitCode;
let output: ReturnType<typeof vi.spyOn>;
let errors: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  process.exitCode = undefined;
  output = vi.spyOn(console, "log").mockImplementation(() => {});
  errors = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(loadConfig).mockResolvedValue(configuration());
  vi.mocked(saveInitialConfig).mockResolvedValue(undefined);
  vi.mocked(runDaemon).mockResolvedValue(undefined);
});
afterEach(() => {
  process.argv = argv;
  process.exitCode = originalExitCode;
});
async function dev(...args: string[]) {
  process.argv = [process.execPath, "dev.ts", ...args];
  await import("../packages/service/src/dev.ts");
}

it("prints development help without writing a config or starting a daemon", async () => {
  await dev("--help");
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining("Usage: npm run dev:service"),
  );
  expect(saveInitialConfig).not.toHaveBeenCalled();
  expect(runDaemon).not.toHaveBeenCalled();
});

it.each([
  {
    platform: "darwin",
    arch: "arm64",
    services: ["core", "document-extractor", "transcriber-mlx"],
  },
  { platform: "darwin", arch: "x64", services: ["core", "document-extractor"] },
  {
    platform: "linux",
    arch: "arm64",
    services: ["core", "document-extractor"],
  },
])(
  "selects supported default development roles on $platform/$arch",
  async ({ platform, arch, services }) => {
    vi.spyOn(process, "platform", "get").mockReturnValue(
      platform as NodeJS.Platform,
    );
    vi.spyOn(process, "arch", "get").mockReturnValue(arch);
    await dev();
    await vi.waitFor(() =>
      expect(runDaemon).toHaveBeenCalledWith(
        join(workspace, ".service-dev/config.json"),
      ),
    );
    expect(saveInitialConfig).toHaveBeenCalledWith(
      join(workspace, ".service-dev/config.json"),
      expect.objectContaining({
        services,
        development: { workspace },
        docker: { manageColima: false, memory: 8 },
      }),
    );
  },
);

it("normalizes explicit initial roles and reuses an existing matching config", async () => {
  vi.mocked(saveInitialConfig).mockRejectedValue(
    Object.assign(new Error("exists"), { code: "EEXIST" }),
  );
  vi.mocked(loadConfig).mockResolvedValue(configuration(["core"]));
  await dev("--config", "/test/config.json", "--services", " core , ,");
  await vi.waitFor(() =>
    expect(runDaemon).toHaveBeenCalledWith("/test/config.json"),
  );
  expect(saveInitialConfig).toHaveBeenCalledWith(
    "/test/config.json",
    expect.objectContaining({ services: ["core"] }),
  );
  expect(errors).not.toHaveBeenCalled();
});

it("preserves existing roles when no new initial selection is requested", async () => {
  vi.mocked(saveInitialConfig).mockRejectedValue(
    Object.assign(new Error("exists"), { code: "EEXIST" }),
  );
  await dev("--config", "/test/config.json");
  await vi.waitFor(() =>
    expect(runDaemon).toHaveBeenCalledWith("/test/config.json"),
  );
  expect(loadConfig).toHaveBeenCalledOnce();
});

it("rejects changed initial roles instead of overwriting the saved config", async () => {
  vi.mocked(saveInitialConfig).mockRejectedValue(
    Object.assign(new Error("exists"), { code: "EEXIST" }),
  );
  await dev("--services", "core");
  await vi.waitFor(() =>
    expect(errors).toHaveBeenCalledWith(
      expect.stringContaining("Configuration already exists"),
    ),
  );
  expect(runDaemon).not.toHaveBeenCalled();
  expect(process.exitCode).toBe(1);
});

it.each([undefined, { workspace: "/another-checkout" }])(
  "rejects a config outside this development checkout",
  async (development) => {
    const current = configuration();
    current.config.development = development;
    vi.mocked(loadConfig).mockResolvedValue(current);
    await dev();
    await vi.waitFor(() =>
      expect(errors).toHaveBeenCalledWith(
        expect.stringContaining(
          "Expected a development config for this checkout",
        ),
      ),
    );
    expect(runDaemon).not.toHaveBeenCalled();
  },
);

it.each([new Error("permission denied"), "non-error failure"])(
  "reports config creation failure without launching services",
  async (error) => {
    vi.mocked(saveInitialConfig).mockRejectedValue(error);
    await dev();
    await vi.waitFor(() =>
      expect(errors).toHaveBeenCalledWith(
        error instanceof Error ? error.message : "Development service failed",
      ),
    );
    expect(process.exitCode).toBe(1);
    expect(runDaemon).not.toHaveBeenCalled();
  },
);

it.each([new Error("unknown command"), "non-error failure"])(
  "reports service CLI entrypoint failures with a nonzero exit code",
  async (error) => {
    vi.mocked(runServiceCLI).mockRejectedValue(error);
    await import("../packages/service/src/main.ts");
    await vi.waitFor(() =>
      expect(errors).toHaveBeenCalledWith(
        error instanceof Error ? error.message : "Service command failed",
      ),
    );
    expect(process.exitCode).toBe(1);
  },
);
