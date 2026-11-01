import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  readlink,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { c } from "tar";
import { createHash } from "node:crypto";
import { parseEnv } from "node:util";
import { afterEach, expect, it, vi } from "vitest";
import { syncArtifacts } from "../packages/service/src/artifacts.ts";
import { configSchema } from "../packages/service/src/config.ts";
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
it.each([
  "KEEP_ME=unchanged\n",
  "KEEP_ME=unchanged\n export SITE_URL = https://old.example\n API_EXTERNAL_URL = https://old.example/auth/v1\n",
])(
  "applies a site URL to minimal or hand-written environment files: %s",
  async (sourceEnv) => {
    const root = await mkdtemp(join(tmpdir(), "service-site-url-"));
    directories.push(root);
    const source = join(root, "input");
    await mkdir(source);
    const xrag = {
      xrag_version: 1,
      xrag_type: "site_url",
      siteUrl: "https://new.example",
    };
    await writeFile(join(source, "xrag.json"), JSON.stringify(xrag));
    await writeFile(join(root, "docker.env"), sourceEnv);
    const file = join(root, "site.tar");
    await c({ cwd: source, file }, ["xrag.json"]);
    const bytes = await readFile(file);
    const id = createHash("sha256").update(bytes).digest("hex");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith(id)
          ? new Response(bytes)
          : Response.json({
              artifacts: [
                {
                  id,
                  xrag,
                  name: "site.tar",
                  size: bytes.length,
                  createdAt: "2026-10-24T10:00:00Z",
                },
              ],
              nextOffset: null,
            }),
      ),
    );
    const hooks = { beforeInstall: vi.fn(), afterInstall: vi.fn() };
    await syncArtifacts(
      {
        root,
        configPath: join(root, "config.json"),
        environment: { SERVICE_API_TOKEN: "x".repeat(64) },
        config: configSchema.parse({
          version: 1,
          id: "00000000-0000-4000-8000-000000000001",
          services: ["core"],
          sharing: { url: "https://sharing.test" },
        }),
      },
      vi.fn(),
      new AbortController().signal,
      hooks,
    );
    expect(parseEnv(await readFile(join(root, "docker.env"), "utf8"))).toEqual({
      KEEP_ME: "unchanged",
      SITE_URL: "https://new.example",
      API_EXTERNAL_URL: "https://new.example/auth/v1",
    });
    expect(hooks.afterInstall).toHaveBeenCalledWith(false);
  },
);
it("runs a setup without freezing docker.env values into the replacement process environment", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-update-env-"));
  directories.push(root);
  const source = join(root, "input");
  await mkdir(join(source, "apps/service"), { recursive: true });
  const xrag = { xrag_version: 1, xrag_type: "setup" };
  await writeFile(join(source, "xrag.json"), JSON.stringify(xrag));
  await writeFile(join(source, "update.mts"), "// fixture");
  await writeFile(join(source, "apps/service/cli.mjs"), "// fixture");
  await writeFile(
    join(source, "setup.sh"),
    '#!/bin/sh\n"$SCHORNAI_TEST_NODE" ./probe.mjs\n',
  );
  await writeFile(
    join(source, "probe.mjs"),
    `import { writeFile } from 'node:fs/promises';
await writeFile(process.env.SCHORNAI_HOME + '/observed.json', JSON.stringify({site:process.env.SITE_URL ?? null}));`,
  );
  const file = join(root, "setup.tar");
  await c({ cwd: source, file }, ["."]);
  const bytes = await readFile(file);
  const id = createHash("sha256").update(bytes).digest("hex");
  vi.stubEnv("SCHORNAI_TEST_NODE", process.execPath);
  vi.stubEnv("SITE_URL", undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith(id)
        ? new Response(bytes)
        : Response.json({
            artifacts: [
              {
                id,
                xrag,
                name: "setup.tar",
                size: bytes.length,
                createdAt: "2026-10-24T10:00:00Z",
              },
            ],
            nextOffset: null,
          }),
    ),
  );
  const hooks = { beforeInstall: vi.fn(), afterInstall: vi.fn() };
  await syncArtifacts(
    {
      root,
      configPath: join(root, "config.json"),
      config: configSchema.parse({
        version: 1,
        id: "00000000-0000-4000-8000-000000000001",
        services: [],
        sharing: { url: "https://sharing.test" },
      }),
      environment: {
        SITE_URL: "https://old.example",
        SERVICE_API_TOKEN: "x".repeat(64),
      },
    },
    vi.fn(),
    new AbortController().signal,
    hooks,
  );
  expect(
    JSON.parse(await readFile(join(root, "observed.json"), "utf8")),
  ).toEqual({ site: null });
  expect(hooks.afterInstall).toHaveBeenCalledWith(true);
});
it("selects only the latest setup across catalog pages and never replays older releases after migration", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-releases-"));
  directories.push(root);
  const older = {
    id: "a".repeat(64),
    name: "old.tar",
    size: 14,
    createdAt: "2026-10-23T10:00:00Z",
    xrag: { xrag_version: 1, xrag_type: "setup" },
  };
  const latest = {
    ...older,
    id: "b".repeat(64),
    name: "new.tar",
    createdAt: "2026-10-24T10:00:00Z",
  };
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("?offset=0"))
      return Response.json({ artifacts: [latest], nextOffset: 1 });
    if (url.endsWith("?offset=1"))
      return Response.json({ artifacts: [older], nextOffset: null });
    return new Response("broken archive");
  });
  vi.stubGlobal("fetch", fetchMock);
  const context = {
    root,
    configPath: join(root, "config.json"),
    config: configSchema.parse({
      version: 1,
      id: "00000000-0000-4000-8000-000000000001",
      services: [],
      sharing: { url: "https://sharing.test" },
    }),
    environment: { SERVICE_API_TOKEN: "x".repeat(64) },
  };
  const hooks = { beforeInstall: vi.fn(), afterInstall: vi.fn() };
  await syncArtifacts(context, vi.fn(), new AbortController().signal, hooks);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "https://sharing.test/api/service/artifacts?offset=0",
    "https://sharing.test/api/service/artifacts?offset=1",
    `https://sharing.test/api/service/artifacts/${latest.id}`,
  ]);
  await writeFile(
    join(root, "service-artifacts.json"),
    JSON.stringify({ [latest.id]: latest.createdAt }),
  );
  fetchMock.mockClear();
  await syncArtifacts(context, vi.fn(), new AbortController().signal, hooks);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(hooks.beforeInstall).not.toHaveBeenCalled();
});
it("downloads only matching weights, verifies their digest, installs the shared path and remembers success", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-sync-"));
  directories.push(root);
  const source = join(root, "input");
  await mkdir(source);
  const xrag = {
    xrag_version: 1,
    xrag_type: "mlxWhisperModel",
    meta: { name: "Test", identifier: "test-whisper" },
  };
  await writeFile(join(source, "xrag.json"), JSON.stringify(xrag));
  await writeFile(join(source, "weights.npz"), "test-weights");
  await writeFile(join(source, "config.json"), "{}");
  const file = join(root, "weights.tar");
  await c({ cwd: source, file }, ["xrag.json", "weights.npz", "config.json"]);
  const bytes = await readFile(file);
  const id = createHash("sha256").update(bytes).digest("hex");
  const artifact = {
    id,
    xrag,
    name: "weights.tar",
    size: bytes.length,
    createdAt: "2026-10-24T10:00:00Z",
    fileSystemIdentifier: "shared-model-id",
  };
  const config = configSchema.parse({
    version: 1,
    id: "00000000-0000-4000-8000-000000000001",
    services: ["supabase"],
    sharing: { url: "https://sharing.test" },
  });
  const context = {
    config,
    root,
    configPath: join(root, "config.json"),
    environment: { SERVICE_API_TOKEN: "x".repeat(64) },
  };
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith(id)
      ? new Response(bytes)
      : Response.json({ artifacts: [artifact], nextOffset: null }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const hooks = { beforeInstall: vi.fn(), afterInstall: vi.fn() };
  await syncArtifacts(context, vi.fn(), new AbortController().signal, hooks);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(hooks.beforeInstall).not.toHaveBeenCalled();
  config.services = ["transcriber-mlx"];
  await syncArtifacts(context, vi.fn(), new AbortController().signal, hooks);
  expect(
    await readFile(
      join(root, "mlx/whisper/models/shared-model-id/weights.npz"),
      "utf8",
    ),
  ).toBe("test-weights");
  expect(hooks.beforeInstall).toHaveBeenCalledTimes(1);
  expect(hooks.afterInstall).toHaveBeenCalledWith(false);
  expect(
    JSON.parse(await readFile(join(root, "service-artifacts.json"), "utf8"))[
      id
    ],
  ).toBeTruthy();
  fetchMock.mockClear();
  await syncArtifacts(context, vi.fn(), new AbortController().signal, hooks);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("leaves a corrupt download retryable without stopping running services", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-corrupt-"));
  directories.push(root);
  const config = configSchema.parse({
    version: 1,
    id: "00000000-0000-4000-8000-000000000001",
    services: [],
    sharing: { url: "https://sharing.test" },
  });
  const id = "a".repeat(64);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith(id)
        ? new Response("broken archive")
        : Response.json({
            artifacts: [
              {
                id,
                name: "update.tar",
                size: 14,
                createdAt: "2026-10-24T10:00:00Z",
                xrag: { xrag_version: 1, xrag_type: "setup" },
              },
            ],
            nextOffset: null,
          }),
    ),
  );
  const hooks = { beforeInstall: vi.fn(), afterInstall: vi.fn() };
  const log = vi.fn();
  await syncArtifacts(
    {
      root,
      config,
      configPath: join(root, "config.json"),
      environment: { SERVICE_API_TOKEN: "x".repeat(64) },
    },
    log,
    new AbortController().signal,
    hooks,
  );
  expect(hooks.beforeInstall).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith(
    "xrag",
    expect.stringContaining("Installation failed"),
    "stderr",
  );
  await expect(
    readFile(join(root, "service-artifacts.json")),
  ).rejects.toMatchObject({ code: "ENOENT" });
});
it("keeps installed generic file links valid after removing the download cache", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-files-"));
  directories.push(root);
  const source = join(root, "input");
  await mkdir(source);
  const xrag = {
    xrag_version: 1,
    xrag_type: "files",
    name: "dictionary",
    targets: ["service"],
  };
  await writeFile(join(source, "xrag.json"), JSON.stringify(xrag));
  await writeFile(join(source, "data.txt"), "dictionary data");
  await symlink("data.txt", join(source, "current"));
  const file = join(root, "files.tar");
  await c({ cwd: source, file }, ["xrag.json", "data.txt", "current"]);
  const bytes = await readFile(file);
  const id = createHash("sha256").update(bytes).digest("hex");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.endsWith(id)
        ? new Response(bytes)
        : Response.json({
            artifacts: [
              {
                id,
                xrag,
                name: "files.tar",
                size: bytes.length,
                createdAt: "2026-10-24T10:00:00Z",
              },
            ],
            nextOffset: null,
          }),
    ),
  );
  await syncArtifacts(
    {
      root,
      configPath: join(root, "config.json"),
      environment: { SERVICE_API_TOKEN: "x".repeat(64) },
      config: configSchema.parse({
        version: 1,
        id: "00000000-0000-4000-8000-000000000001",
        services: [],
        sharing: { url: "https://sharing.test" },
      }),
    },
    vi.fn(),
    new AbortController().signal,
    { beforeInstall: vi.fn(), afterInstall: vi.fn() },
  );
  const installedLink = join(root, "assets/dictionary", id, "current");
  expect(await readlink(installedLink)).toBe("data.txt");
  expect(await readFile(installedLink, "utf8")).toBe("dictionary data");
});

it("does not fall back to an older setup when the latest has been deleted", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-withdrawn-"));
  directories.push(root);
  const artifacts = [
    {
      id: "a".repeat(64),
      name: "old.tar",
      size: 1,
      createdAt: "2026-10-23T10:00:00Z",
      xrag: { xrag_version: 1, xrag_type: "setup" },
    },
    {
      id: "b".repeat(64),
      name: "latest.tar",
      size: 1,
      createdAt: "2026-10-24T10:00:00Z",
      deletedAt: "2026-10-24T11:00:00Z",
      xrag: { xrag_version: 1, xrag_type: "setup" },
    },
  ];
  const fetcher = vi.fn(async () =>
    Response.json({ artifacts, nextOffset: null }),
  );
  vi.stubGlobal("fetch", fetcher);
  const hooks = { beforeInstall: vi.fn(), afterInstall: vi.fn() };
  await syncArtifacts(
    {
      root,
      configPath: join(root, "config.json"),
      config: configSchema.parse({
        version: 1,
        id: "00000000-0000-4000-8000-000000000001",
        services: [],
        sharing: { url: "https://sharing.test" },
      }),
      environment: { SERVICE_API_TOKEN: "x".repeat(64) },
    },
    vi.fn(),
    new AbortController().signal,
    hooks,
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(hooks.beforeInstall).not.toHaveBeenCalled();
});
