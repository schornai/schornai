import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import {
  nativeResourceId,
  importedResourceId,
} from "../packages/xrag/src/identity.ts";
import { extractArchive } from "../packages/xrag/src/archive.ts";
import { serializeResource } from "../packages/database/src/xrag/resource.ts";
import { prepareResourceImport } from "../packages/database/src/xrag/prepareResourceImport.ts";
import { prepareConfirmedResourceImport } from "../packages/database/src/xrag/prepareConfirmedResourceImport.ts";
import { exportResource } from "../packages/database/src/xrag/exportResource.ts";
import { getResourceExport } from "../packages/database/src/xrag/getResourceExport.ts";
vi.mock("undici", () => ({
  fetch: (...args: Parameters<typeof fetch>) => fetch(...args),
}));

const workspace = "workspace";
const origin = nativeResourceId("documentRepository", "repository");
const transcriberOrigin = nativeResourceId("transcriber", "transcriber");
const resource = serializeResource(
  "documentRepository",
  {
    name: "Repository",
    description: "Knowledge",
    type: "database-v2",
    transcriberIdentifier: "transcriber",
  },
  origin,
  [{ kind: "transcriber", id: transcriberOrigin, identifier: "transcriber" }],
);

function options(role = "workspace-admin") {
  const supabase = {
    auth: {
      getClaims: vi.fn(async () => ({
        data: {
          claims: {
            organization_roles: [{ organization_id: workspace, role }],
          },
        },
        error: null,
      })),
    },
    from: vi.fn(() =>
      query({
        data: {
          id: "repository",
          organization_id: workspace,
          name: "Repository",
          description: "Knowledge",
          config: { type: "database-v2", identifier: "repository" },
        },
      }),
    ),
  };
  const supabaseServiceRole = {
    from: vi.fn(() => query({ data: null, error: null })),
    rpc: vi.fn(async () => ({ data: null as string | null, error: null })),
  };
  return { supabase, supabaseServiceRole };
}
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

it("prepares delayed references without mutating resources and atomically commits", async () => {
  const clients = options();
  const entries = await prepareResourceImport(
    [resource],
    { workspaceId: workspace },
    clients as any,
  );
  expect(entries[0]).toMatchObject({
    originId: origin,
    localId: importedResourceId(workspace, "documentRepository", origin),
    expectedRevision: null,
    config: {
      transcriberIdentifier: importedResourceId(
        workspace,
        "transcriber",
        transcriberOrigin,
      ),
    },
  });
  expect(clients.supabaseServiceRole.rpc).toHaveBeenCalledTimes(1);
  expect(clients.supabaseServiceRole.rpc).toHaveBeenCalledWith(
    "xrag_resource_revision",
    expect.anything(),
  );
  expect(
    await prepareConfirmedResourceImport(
      [resource],
      { workspaceId: workspace },
      {},
      clients as any,
    ),
  ).toEqual(entries);
});

it("requires the exact revision shown at confirmation", async () => {
  const clients = options();
  clients.supabaseServiceRole.rpc.mockImplementation(async (name: string) => ({
    data: name === "xrag_resource_revision" ? "current-revision" : null,
    error: null,
  }));
  for (const revisions of [{}, { [origin]: "old-revision" }]) {
    await expect(
      prepareConfirmedResourceImport(
        [resource],
        { workspaceId: workspace },
        revisions,
        clients as any,
      ),
    ).rejects.toThrow("IMPORT_CONFLICT");
  }
  expect(
    clients.supabaseServiceRole.rpc.mock.calls.every(
      ([name]) => name === "xrag_resource_revision",
    ),
  ).toBe(true);
  await prepareConfirmedResourceImport(
    [resource],
    { workspaceId: workspace },
    { [origin]: "current-revision" },
    clients as any,
  );
  expect(clients.supabaseServiceRole.rpc).toHaveBeenLastCalledWith(
    "xrag_resource_revision",
    expect.anything(),
  );
});

it("rejects unauthorized or mixed imports before touching privileged data", async () => {
  const clients = options("editor");
  await expect(
    prepareResourceImport(
      [resource],
      { workspaceId: workspace },
      clients as any,
    ),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(clients.supabaseServiceRole.from).not.toHaveBeenCalled();
  expect(clients.supabaseServiceRole.rpc).not.toHaveBeenCalled();
  const admin = options();
  await expect(
    prepareResourceImport(
      [resource, { xrag_version: 1, xrag_type: "setup" }],
      { workspaceId: workspace },
      admin as any,
    ),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(admin.supabaseServiceRole.rpc).not.toHaveBeenCalled();
});

it("rejects conflicting versions of the same logical object", async () => {
  const clients = options();
  await expect(
    prepareResourceImport(
      [resource, resource],
      { workspaceId: workspace },
      clients as any,
    ),
  ).rejects.toThrow("DUPLICATE_RESOURCE");
  expect(clients.supabaseServiceRole.rpc).not.toHaveBeenCalled();
});

it("exports repository bytes through the authorized storage client", async () => {
  const root = await mkdtemp(join(tmpdir(), "resource-export-"));
  roots.push(root);
  const clients = options();
  clients.supabaseServiceRole.from.mockImplementation(() =>
    query({
      data: { origin_id: origin, workspace_id: workspace },
      error: null,
    }),
  );
  const bucket = {
    list: vi.fn(async () => ({
      data: [{ name: "notes.txt", metadata: { size: 5 } }],
      error: null,
    })),
    createSignedUrl: vi.fn(async () => ({
      data: { signedUrl: "https://storage.test/signed" },
      error: null,
    })),
  };
  const supabase = {
    ...clients.supabase,
    storage: { from: vi.fn(() => bucket) },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("notes")),
  );
  const file = join(root, "export.tar");
  const exported = await exportResource(
    "documentRepository",
    "repository",
    file,
    { ...clients, supabase } as any,
  );
  expect(bucket.createSignedUrl).toHaveBeenCalledWith(
    "workspace/repository/notes.txt",
    3600,
  );
  const destination = join(root, "unpacked");
  await mkdir(destination);
  await extractArchive(file, destination, exported.id);
  expect(await readFile(join(destination, "files/notes.txt"), "utf8")).toBe(
    "notes",
  );
  expect(exported.resourceId).toBe(origin);
});

it("denies export to readers before identity registration", async () => {
  const clients = options("user");
  await expect(
    exportResource(
      "documentRepository",
      "repository",
      "/unused",
      clients as any,
    ),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(clients.supabaseServiceRole.from).not.toHaveBeenCalled();
});

it("exports an agent with stable identities for its accessible dependencies", async () => {
  const clients = options();
  clients.supabase.from.mockImplementation((table: string) =>
    query({
      data:
        table === "chatbots"
          ? {
              id: "agent",
              organization_id: workspace,
              name: "Agent",
              description: "Description",
              config: {
                version: "agent-config-version-4",
                additionalFunctions: {},
                color: { type: "color-oklch-hue", oklchHue: 120 },
                icon: { type: "icon-lucide", iconName: "Bot" },
                documentation: "",
                recommendedMessages: [],
                modelIdentifier: "model",
                modelThinking: "optional-on",
                transcriberIdentifier: "transcriber",
                roles: [
                  {
                    id: origin,
                    prompt: "Prompt",
                    documentRepositoryMounts: [
                      {
                        id: origin,
                        documentRepositoryIdentifier: "repository",
                        permission: "read-only",
                      },
                    ],
                  },
                ],
              },
            }
          : table === "transcribers"
            ? [
                {
                  id: "transcriber",
                  organization_id: workspace,
                  name: "Transcriber",
                  description: "",
                  prompt: "",
                  config: {
                    version: "transcriber-v2",
                    identifier: "transcriber",
                  },
                },
              ]
            : [
                {
                  id: "repository",
                  organization_id: workspace,
                  name: "Repository",
                  description: "",
                  config: { type: "database-v2", identifier: "repository" },
                },
              ],
      error: null,
    }),
  );
  for (const [kind, localId] of [
    ["transcriber", "transcriber"],
    ["documentRepository", "repository"],
    ["agent", "agent"],
  ] as const) {
    clients.supabaseServiceRole.from
      .mockReturnValueOnce(query())
      .mockReturnValueOnce(
        query({
          data: {
            origin_id: nativeResourceId(kind, localId),
            workspace_id: workspace,
          },
        }),
      );
  }
  const result = await getResourceExport("agent", "agent", clients as any);
  expect(result.resource.references).toEqual([
    {
      kind: "model",
      id: nativeResourceId("model", "model"),
      identifier: "model",
    },
    { kind: "transcriber", id: transcriberOrigin, identifier: "transcriber" },
    { kind: "documentRepository", id: origin, identifier: "repository" },
  ]);
  expect(result.resource.id).toBe(nativeResourceId("agent", "agent"));
});

it.each([null, "original-speech"])(
  "exports a missing transcriber reference with stored origin %s",
  async (storedOrigin) => {
    const clients = options();
    clients.supabase.from.mockImplementation((table: string) =>
      query({
        data:
          table === "databases"
            ? {
                id: "repository",
                organization_id: workspace,
                name: "Repository",
                description: "",
                config: {
                  type: "database-v2",
                  identifier: "repository",
                  transcriberIdentifier: "absent",
                },
              }
            : [],
      }),
    );
    const lookup = query({
      data: storedOrigin ? { origin_id: storedOrigin } : null,
    });
    clients.supabaseServiceRole.from
      .mockReturnValueOnce(lookup)
      .mockReturnValueOnce(query())
      .mockReturnValueOnce(
        query({ data: { origin_id: origin, workspace_id: workspace } }),
      );
    const { resource } = await getResourceExport(
      "documentRepository",
      "repository",
      clients as any,
    );
    expect(resource.references).toEqual([
      {
        kind: "transcriber",
        identifier: "absent",
        id: storedOrigin ?? nativeResourceId("transcriber", "absent"),
      },
    ]);
    expect(resource.data).toMatchObject({ transcriberIdentifier: "absent" });
    expect(lookup.eq).toHaveBeenCalledWith("workspace_id", workspace);
    expect(lookup.eq).toHaveBeenCalledWith("local_id", "absent");
    expect(lookup.eq).toHaveBeenCalledWith("kind", "transcriber");
  },
);

it("re-exports an imported transcriber using its original identity", async () => {
  const clients = options();
  clients.supabase.from.mockReturnValue(
    query({
      data: {
        id: "local-copy",
        organization_id: workspace,
        name: "Transcriber",
        prompt: "Names",
        config: {
          identifier: "local-copy",
          version: "transcriber-v2",
          retryLevel: "balanced",
        },
      },
    }),
  );
  clients.supabaseServiceRole.from.mockReturnValue(
    query({ data: { origin_id: transcriberOrigin, workspace_id: workspace } }),
  );
  const result = await getResourceExport(
    "transcriber",
    "local-copy",
    clients as any,
  );
  expect(result.resource.id).toBe(transcriberOrigin);
  expect(result.resource.data).toMatchObject({
    name: "Transcriber",
    prompt: "Names",
    retryLevel: "balanced",
  });
});

it("keeps existing runtime identifiers when importing configurations and their references", async () => {
  const clients = options();
  clients.supabaseServiceRole.from.mockImplementation((table: string) =>
    query({
      data:
        table === "xrag_resource_origins"
          ? { local_id: "existing" }
          : {
              config: {
                identifier:
                  table === "transcribers"
                    ? "existing-transcriber-name"
                    : "existing-repository-name",
              },
            },
      error: null,
    }),
  );
  const entries = await prepareResourceImport(
    [resource],
    { workspaceId: workspace },
    clients as any,
  );
  expect(entries[0]).toMatchObject({
    localId: "existing",
    config: {
      identifier: "existing-repository-name",
      transcriberIdentifier: "existing-transcriber-name",
    },
  });
});

it("remaps automation dependencies and assigns the importer without exporting runtime ownership", async () => {
  const clients = options();
  const automation = serializeResource(
    "automation",
    {
      name: "Check",
      agentId: "source-agent",
      message: "Check",
      enabled: false,
      trigger: {
        type: "storage",
        storage: {
          type: "documentRepository",
          documentRepositoryId: "source-repo",
        },
        events: ["uploaded"],
        folder: "/",
        includeSubfolders: false,
        attachment: "reference",
      },
    },
    "check-docs",
    [
      { kind: "agent", identifier: "source-agent", id: "agent-origin" },
      {
        kind: "documentRepository",
        identifier: "source-repo",
        id: "repo-origin",
      },
    ],
  );
  const entries = await prepareResourceImport(
    [automation],
    { workspaceId: workspace },
    {
      ...clients,
      authenticated: { userId: "importer", claims: "admin" },
    } as any,
  );
  expect(entries[0]).toMatchObject({
    kind: "automation",
    config: {
      userId: "importer",
      enabled: false,
      nextRunAt: null,
      agentId: importedResourceId(workspace, "agent", "agent-origin"),
      trigger: {
        storage: {
          workspaceId: workspace,
          documentRepositoryId: importedResourceId(
            workspace,
            "documentRepository",
            "repo-origin",
          ),
        },
      },
    },
  });
});

it("exports an owned automation with the agent's stable origin", async () => {
  const clients = options();
  const agentConfig = {
    version: "agent-config-version-4",
    additionalFunctions: {},
    color: { type: "color-oklch-hue", oklchHue: 120 },
    icon: { type: "icon-lucide", iconName: "Bot" },
    documentation: "",
    recommendedMessages: [],
    modelIdentifier: "model",
    modelThinking: "optional-on",
    roles: [],
  };
  const automationId = "11111111-1111-4111-8111-111111111111";
  const automationRow = {
    id: automationId,
    name: "Daily",
    agent_id: "agent",
    message: "Check",
    enabled: false,
    trigger: { type: "time", schedule: { kind: "hours", every: 1 } },
    created_at: "2026-11-18T00:00:00Z",
    next_run_at: null,
  };
  clients.supabase.from.mockImplementation((table) =>
    query({
      data:
        table === "automations"
          ? [automationRow]
          : table === "chatbots"
            ? [
                {
                  id: "agent",
                  organization_id: workspace,
                  name: "Assistant",
                  description: "",
                  config: agentConfig,
                },
              ]
            : [],
    }),
  );
  // The single-agent lookup returns a row; the dependency listing returns rows.
  const base = clients.supabase.from.getMockImplementation()!;
  let agentReads = 0;
  clients.supabase.from.mockImplementation((table) => {
    if (table === "chatbots" && ++agentReads === 1)
      return query({
        data: {
          id: "agent",
          organization_id: workspace,
          name: "Assistant",
          description: "",
          config: agentConfig,
        },
      });
    return base(table);
  });
  clients.supabaseServiceRole.from.mockReturnValue(
    query({ data: { origin_id: "stable-origin", workspace_id: workspace } }),
  );
  const exported = await getResourceExport(
    "automation",
    automationId,
    clients as any,
  );
  expect(exported.resource.resourceType).toBe("automation");
  expect(exported.resource.references).toEqual([
    { kind: "agent", id: "stable-origin", identifier: "agent" },
  ]);
});

it("schedules imported time automations and preserves the workspace permission ceiling", async () => {
  const clients = options();
  const input = {
    name: "Check",
    agentId: "source-agent",
    message: "Check",
    enabled: true,
    trigger: { type: "time", schedule: { kind: "hours", every: 1 } },
  };
  const archive = serializeResource("automation", input, "hourly", [
    { kind: "agent", identifier: "source-agent", id: "agent-origin" },
  ]);
  const context = {
    ...clients,
    authenticated: {
      userId: "importer",
      claims: [{ organization_id: workspace, role: "workspace-admin" }],
    },
  } as any;
  const entries = await prepareResourceImport(
    [archive],
    { workspaceId: workspace },
    context,
  );
  expect(entries[0].config).toMatchObject({
    accessLevel: "workspace",
    enabled: true,
    nextRunAt: expect.any(String),
  });
  const past = serializeResource(
    "automation",
    {
      ...input,
      trigger: {
        type: "time",
        schedule: { kind: "once", at: "2020-01-01T00:00:00Z" },
      },
    },
    "past",
    archive.references,
  );
  await expect(
    prepareResourceImport([past], { workspaceId: workspace }, context),
  ).rejects.toThrow("AUTOMATION_DATE_PAST");
});
it("does not export an automation absent from the caller's visible records", async () => {
  const clients = options();
  clients.supabase.from.mockReturnValue(query({ data: [] }));
  await expect(
    getResourceExport(
      "automation",
      "11111111-1111-4111-8111-111111111111",
      clients as any,
    ),
  ).rejects.toThrow("XRAG_RESOURCE_UNAVAILABLE");
  expect(clients.supabaseServiceRole.from).not.toHaveBeenCalled();
});
