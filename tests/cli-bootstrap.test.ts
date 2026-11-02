import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { X509Certificate } from "node:crypto";
import { parseEnv } from "node:util";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline/promises";
import { c } from "tar";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  latestSetupUrl,
  runDefaultCLI,
} from "../packages/service/src/bootstrap.ts";
import { initialServices } from "../packages/service/src/initialSetup.ts";
import { initConfig } from "../packages/service/src/config.ts";
import { control } from "../packages/service/src/control.ts";
import { run } from "../packages/service/src/process.ts";
import { setupInitialAdmin } from "../packages/service/src/initialAdmin.ts";

vi.mock("../packages/service/src/initialAdmin.ts", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("../packages/service/src/initialAdmin.ts")
  >()),
  setupInitialAdmin: vi.fn(),
}));
vi.mock("../packages/service/src/process.ts", () => ({ run: vi.fn() }));
vi.mock("../packages/service/src/control.ts", () => ({ control: vi.fn() }));
vi.mock("node:readline/promises", () => ({ createInterface: vi.fn() }));
let directory: string;
let root: string;
let output: ReturnType<typeof vi.spyOn>;
let prompt: EventEmitter & {
  question: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
};

beforeEach(async () => {
  vi.mocked(setupInitialAdmin).mockReset().mockResolvedValue(undefined);
  directory = await mkdtemp(join(tmpdir(), "cli-bootstrap-test-"));
  root = join(directory, "machine");
  vi.stubEnv("SCHORNAI_HOME", root);
  vi.stubEnv("SCHORNAI_CONFIG", undefined);
  output = vi.spyOn(console, "log").mockImplementation(() => {});
  prompt = Object.assign(new EventEmitter(), {
    question: vi.fn().mockResolvedValue("y"),
    close: vi.fn(() => prompt.emit("close")),
  });
  vi.mocked(createInterface)
    .mockReset()
    .mockReturnValue(prompt as unknown as ReturnType<typeof createInterface>);
  vi.mocked(control)
    .mockReset()
    .mockRejectedValue(Object.assign(new Error("Stopped"), { code: "ENOENT" }));
  vi.mocked(run)
    .mockReset()
    .mockImplementation(async (command) => {
      if (command.name === "setup") {
        await mkdir(join(root, "apps/service"), { recursive: true });
        await writeFile(
          join(root, "apps/service/cli.mjs"),
          "installed runtime",
        );
      }
    });
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function bundle({
  platform = process.platform as string,
  arch = process.arch as string,
  type = "setup",
  unsafe = false,
  symlinkChain = false,
} = {}) {
  const payload = join(directory, "bundle");
  await mkdir(join(payload, "apps/service"), { recursive: true });
  const files: Record<string, string> = {
    "xrag.json": JSON.stringify(
      type === "setup"
        ? { xrag_type: type, xrag_version: 1, platform, arch }
        : {
            xrag_type: "files",
            xrag_version: 1,
            name: "data",
            targets: ["service"],
          },
    ),
    "installation.json": JSON.stringify({ version: 1, platform, arch }),
    "setup.sh": "#!/bin/bash\nexit 0\n",
    "update.mts": "// test setup",
    "apps/service/cli.mjs": "// test service",
  };
  for (const [name, content] of Object.entries(files))
    await writeFile(join(payload, name), content);
  if (symlinkChain) {
    await symlink("apps/service/cli.mjs", join(payload, "runtime-current"));
    await symlink("runtime-current", join(payload, "runtime"));
  }
  if (unsafe) await writeFile(join(directory, "escape"), "must not extract");
  const archive = join(directory, "bundle.tar");
  await c({ cwd: payload, file: archive, portable: true }, [
    ...Object.keys(files),
    ...(symlinkChain ? ["runtime-current", "runtime"] : []),
    ...(unsafe ? ["../escape"] : []),
  ]);
  const bytes = await readFile(archive);
  vi.mocked(fetch).mockImplementation(async () => new Response(bytes));
}

it("installs a setup containing a valid symlink chain and cleans up successfully", async () => {
  await bundle({ symlinkChain: true });
  await runDefaultCLI();
  expect(run).toHaveBeenCalledWith(
    expect.objectContaining({ name: "setup" }),
    expect.any(Function),
    expect.any(AbortSignal),
  );
  expect(output).toHaveBeenCalledWith(
    "Download complete. Verifying and extracting schorn.ai setup...",
  );
  expect(output).toHaveBeenCalledWith("schorn.ai installed successfully");
  expect(setupInitialAdmin).toHaveBeenCalledWith(
    expect.objectContaining({ root }),
  );
  expect(await readdir(root)).not.toContain(".setup-incomplete.json");
  expect(await readdir(root)).not.toContain(".setup-lock");
});

it.each(["running", "stopped"])(
  "reports an installed %s service without downloading or modifying it",
  async (state) => {
    await initConfig(join(root, "config.json"), ["core"]);
    await mkdir(join(root, "apps/service"), { recursive: true });
    await writeFile(join(root, "apps/service/cli.mjs"), "keep runtime");
    if (state === "running")
      vi.mocked(control).mockResolvedValue({
        state,
        pid: 123,
        services: ["core"],
      });
    await runDefaultCLI();
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining("already installed"),
    );
    expect(output).toHaveBeenCalledWith(
      state === "running" ? "running (PID 123): core" : "stopped",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(createInterface).not.toHaveBeenCalled();
    expect(setupInitialAdmin).not.toHaveBeenCalled();
    expect(await readFile(join(root, "apps/service/cli.mjs"), "utf8")).toBe(
      "keep runtime",
    );
  },
);

it("recognizes legacy installations without downloading or migrating them", async () => {
  await mkdir(join(root, "docker"), { recursive: true });
  await writeFile(
    join(root, "docker/docker-compose.yml"),
    "name: supabase\nservices: {}\n",
  );
  await runDefaultCLI();
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining("legacy Admin installation"),
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(run).not.toHaveBeenCalled();
  expect(createInterface).not.toHaveBeenCalled();
});

it.each(["n", "N", "", "invalid"])(
  "does not download or create files when setup is not confirmed: %j",
  async (answer) => {
    prompt.question.mockResolvedValue(answer);
    await runDefaultCLI();
    expect(prompt.question).toHaveBeenCalledWith(
      `Install schorn.ai in ${root} and start its services? [y/N] `,
      expect.any(Object),
    );
    expect(prompt.close).toHaveBeenCalledOnce();
    expect(output).toHaveBeenCalledWith("Installation cancelled.");
    expect(fetch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    await expect(stat(root)).rejects.toMatchObject({ code: "ENOENT" });
  },
);

it.each(["close", "SIGINT"])(
  "cancels without installing when the prompt receives %s",
  async (event) => {
    prompt.question.mockImplementation(async (_question, { signal }) => {
      queueMicrotask(() => prompt.emit(event));
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });
    });
    await runDefaultCLI();
    expect(prompt.close).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    await expect(stat(root)).rejects.toMatchObject({ code: "ENOENT" });
  },
);

it("installs a new local instance, preserves its secrets on subsequent calls and cleans up the download", async () => {
  await bundle();
  prompt.question.mockResolvedValue(" Y ");
  await runDefaultCLI();
  expect(fetch).toHaveBeenCalledWith(
    latestSetupUrl,
    expect.objectContaining({ redirect: "manual" }),
  );
  const config = JSON.parse(await readFile(join(root, "config.json"), "utf8"));
  expect(config.services).toEqual(
    initialServices(process.platform, process.arch),
  );
  expect(config.sharing).toEqual({ url: "http://127.0.0.1:3001" });
  const envSource = await readFile(join(root, "docker.env"), "utf8");
  const env = parseEnv(envSource);
  expect(env.BOX_ID).toBe(config.id);
  expect(env.SITE_URL).toBe("https://localhost");
  expect(env.API_EXTERNAL_URL).toBe("https://localhost/auth/v1");
  expect(env.POSTGRES_PASSWORD).toHaveLength(64);
  expect(env.SERVICE_API_TOKEN).toHaveLength(64);
  expect((await stat(join(root, "docker.env"))).mode & 0o777).toBe(0o600);
  const certPath = join(root, "docker/volumes/api/cert");
  expect((await stat(join(certPath, "privkey.pem"))).mode & 0o777).toBe(0o600);
  const cert = new X509Certificate(
    await readFile(join(certPath, "fullkey.pem")),
  );
  expect(cert.checkHost("localhost")).toBe("localhost");
  expect(cert.checkIP("127.0.0.1")).toBe("127.0.0.1");
  const [setup, start] = vi.mocked(run).mock.calls.map(([command]) => command);
  expect(setup).toMatchObject({
    name: "setup",
    command: "bash",
    env: {
      SCHORNAI_HOME: root,
      SCHORNAI_CONFIG: join(root, "config.json"),
      SCHORNAI_NODE: process.execPath,
      SCHORNAI_SERVICE_UPDATE: "1",
    },
  });
  expect(start?.args).toEqual([
    join(root, "apps/service/cli.mjs"),
    "service",
    "start",
    "--config",
    join(root, "config.json"),
  ]);
  await expect(stat(setup!.cwd!)).rejects.toMatchObject({ code: "ENOENT" });
  expect(await readdir(root)).not.toContain(".setup-incomplete.json");
  expect(await readdir(root)).not.toContain(".setup-lock");
  await runDefaultCLI();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(prompt.question).toHaveBeenCalledOnce();
  expect(await readFile(join(root, "docker.env"), "utf8")).toBe(envSource);
  expect(output.mock.calls.flat().join("\n")).not.toContain(
    env.POSTGRES_PASSWORD,
  );
});

it("completes a config-only worker installation without replacing credentials or selecting extra services", async () => {
  await bundle();
  await initConfig(join(root, "config.json"), ["document-extractor"]);
  await writeFile(join(root, "docker.env"), "REMOTE_SECRET=keep\n");
  const before = await readFile(join(root, "config.json"), "utf8");
  await runDefaultCLI();
  expect(run).toHaveBeenCalled();
  expect(setupInitialAdmin).not.toHaveBeenCalled();
  expect(await readFile(join(root, "config.json"), "utf8")).toBe(before);
  expect(await readFile(join(root, "docker.env"), "utf8")).toBe(
    "REMOTE_SECRET=keep\n",
  );
});

it("keeps the installed runtime when administrator setup fails so it can be retried separately", async () => {
  await bundle();
  vi.mocked(setupInitialAdmin).mockRejectedValue(
    new Error("Admin setup failed; retry setup-admin"),
  );
  await expect(runDefaultCLI()).rejects.toThrow("retry setup-admin");
  expect(await readdir(root)).not.toContain(".setup-incomplete.json");
  expect(await readdir(root)).not.toContain(".setup-lock");
  await runDefaultCLI();
  expect(fetch).toHaveBeenCalledOnce();
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining("service setup-admin"),
  );
});

it("retries a failed setup even if it left a runtime, preserving generated credentials", async () => {
  await bundle();
  vi.mocked(run).mockImplementationOnce(async () => {
    await mkdir(join(root, "apps/service"), { recursive: true });
    await writeFile(join(root, "apps/service/cli.mjs"), "partial runtime");
    throw new Error("Docker unavailable");
  });
  await expect(runDefaultCLI()).rejects.toThrow("Docker unavailable");
  const before = await readFile(join(root, "docker.env"), "utf8");
  expect(await readdir(root)).toContain(".setup-incomplete.json");
  expect(await readdir(root)).not.toContain(".setup-lock");
  prompt.question.mockResolvedValueOnce("n");
  await runDefaultCLI();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await readFile(join(root, "docker.env"), "utf8")).toBe(before);
  expect(await readdir(root)).toContain(".setup-incomplete.json");
  await runDefaultCLI();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(await readFile(join(root, "docker.env"), "utf8")).toBe(before);
  expect(await readdir(root)).not.toContain(".setup-incomplete.json");
});

it.each([404, 503])(
  "reports HTTP %i without creating an installation",
  async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response("unavailable", { status }));
    await expect(runDefaultCLI()).rejects.toThrow(`HTTP ${status}`);
    expect(await readdir(root)).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  },
);

it("cancels an interrupted download, releases the lock and removes its signal handlers", async () => {
  const listeners = new Set(process.listeners("SIGINT"));
  vi.mocked(fetch).mockImplementation(async (_url, options) => {
    const signal = options!.signal!;
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
  });
  const interrupted =
    expect(runDefaultCLI()).rejects.toThrow("Setup interrupted");
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  const handler = process
    .listeners("SIGINT")
    .find((listener) => !listeners.has(listener));
  expect(handler).toBeDefined();
  handler!();
  await interrupted;
  expect(await readdir(root)).toEqual([]);
  expect(new Set(process.listeners("SIGINT"))).toEqual(listeners);
  expect(run).not.toHaveBeenCalled();
});

it("keeps a successful installation when only startup fails", async () => {
  await bundle();
  await initConfig(join(root, "config.json"), []);
  vi.mocked(run).mockImplementation(async (command) => {
    if (command.name === "service") throw new Error("Service failed to start");
    await mkdir(join(root, "apps/service"), { recursive: true });
    await writeFile(join(root, "apps/service/cli.mjs"), "installed runtime");
  });
  await expect(runDefaultCLI()).rejects.toThrow("Service failed to start");
  expect(await readdir(root)).not.toContain(".setup-incomplete.json");
  await runDefaultCLI();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(output).toHaveBeenCalledWith("stopped");
});

it.each([
  { type: "files", message: "not an XRAG setup" },
  {
    arch: process.arch === "arm64" ? "x64" : "arm64",
    message: "does not match",
  },
  { unsafe: true, message: "XRAG_UNSAFE_PATH" },
])(
  "rejects an invalid or incompatible bundle before initializing the machine: $message",
  async ({ message, ...options }) => {
    await bundle(options);
    await expect(runDefaultCLI()).rejects.toThrow(message);
    expect(await readdir(root)).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  },
);

it("follows HTTPS download redirects and rejects an insecure redirect", async () => {
  await bundle();
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(null, {
      status: 302,
      headers: { location: "http://cdn.example.test/setup.tar" },
    }),
  );
  await expect(runDefaultCLI()).rejects.toThrow("require HTTPS");
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.mocked(fetch)
    .mockClear()
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://cdn.example.test/setup.tar" },
      }),
    );
  await runDefaultCLI();
  expect(fetch).toHaveBeenLastCalledWith(
    "https://cdn.example.test/setup.tar",
    expect.any(Object),
  );
});

it("honors SCHORNAI_CONFIG and protects existing files without a config", async () => {
  await mkdir(root, { recursive: true });
  await writeFile(join(root, "docker.env"), "KEEP=private\n");
  await expect(runDefaultCLI()).rejects.toThrow("Restore config.json");
  expect(fetch).not.toHaveBeenCalled();
  const custom = join(directory, "custom", "machine.json");
  await initConfig(custom, []);
  vi.stubEnv("SCHORNAI_CONFIG", custom);
  await mkdir(join(directory, "custom/apps/service"), { recursive: true });
  await writeFile(join(directory, "custom/apps/service/cli.mjs"), "runtime");
  await runDefaultCLI();
  expect(control).toHaveBeenCalledWith(join(directory, "custom"), "status");
});

it("rejects a second setup while the first owns the installation lock", async () => {
  await mkdir(join(root, ".setup-lock"), { recursive: true });
  await writeFile(
    join(root, ".setup-lock/owner.json"),
    JSON.stringify({ pid: process.pid }),
  );
  await expect(runDefaultCLI()).rejects.toThrow("already running");
  expect(fetch).not.toHaveBeenCalled();
});

it("selects only supported local services for each bundle target", () => {
  expect(initialServices("linux", "x64")).toEqual([
    "core",
    "supabase",
    "document-extractor",
  ]);
  expect(initialServices("linux", "arm64")).toEqual(
    initialServices("linux", "x64"),
  );
  expect(initialServices("darwin", "arm64")).toEqual([
    "core",
    "supabase",
    "document-extractor",
    "ollama",
    "transcriber-mlx",
  ]);
  expect(() => initialServices("win32", "x64")).toThrow(
    "No schorn.ai setup is supported",
  );
  expect(() => initialServices("darwin", "x64")).toThrow(
    "No schorn.ai setup is supported",
  );
});
