import { importBackend } from "./helpers/xragImport.ts";
import { previewXRAGImport } from "../packages/database/src/xrag/previewXRAGImport.ts";
import { importXRAGTransfer } from "../packages/database/src/xrag/importXRAGTransfer.ts";
import { beforeEach, expect, it, vi } from "vitest";
import { getResourceExport } from "../packages/database/src/xrag/getResourceExport.ts";
import { resolveExternalXRAGModels } from "../packages/database/src/xrag/resolveExternalXRAGModels.ts";
import { prepareConfirmedResourceImport } from "../packages/database/src/xrag/prepareConfirmedResourceImport.ts";
import { serializeResource } from "../packages/database/src/xrag/resource.ts";
import { query } from "./helpers/supabase.ts";
const calls = vi.hoisted(() => ({
  models: vi.fn(),
  root: vi.fn(),
  archives: vi.fn(),
  client: undefined as any,
}));
vi.mock("../packages/database/src/aiModel/getAIModels.ts", () => ({
  getAIModels: calls.models,
}));
vi.mock("../packages/database/src/xrag/getAuthorizedResource.ts", () => ({
  getAuthorizedResource: calls.root,
}));
vi.mock("../packages/database/src/xrag/getResourceIdentity.ts", () => ({
  getResourceIdentity: vi.fn(async () => "test/agent"),
}));
vi.mock("../packages/database/src/xrag/createImportStorageClient.ts", () => ({
  createImportStorageClient: () => calls.client,
}));
const descriptor = { provider: "openai", modelId: "gpt-test" };
const source = "external:source-instance";
function agent() {
  return {
    name: "Agent",
    description: "",
    version: "agent-config-version-4",
    additionalFunctions: {},
    color: { type: "color-oklch-hue", oklchHue: 120 },
    icon: { type: "icon-lucide", iconName: "bot" },
    documentation: "",
    recommendedMessages: [],
    modelIdentifier: source,
    modelThinking: "optional-on",
    roles: [
      {
        id: "role",
        prompt: "Help",
        modelIdentifierOverride: source,
        documentRepositoryMounts: [],
      },
    ],
  };
}
function resource() {
  return serializeResource("agent", agent(), "test/agent", [
    {
      kind: "model",
      id: "test/model",
      identifier: source,
      externalModel: descriptor,
    },
  ]);
}
function model(
  identifier = "external:target",
  provider = "openai",
  modelId = "gpt-test",
) {
  return {
    id: identifier,
    identifier,
    name: "Target " + identifier,
    type: "external_llm_v1",
    config: {
      provider,
      modelId,
      baseUrl: "https://private.example",
      headers: { Authorization: "secret" },
    },
  };
}
function options() {
  return {
    supabase: {},
    authenticated: {
      userId: "owner",
      claims: [{ organization_id: "workspace", role: "workspace-admin" }],
    },
    supabaseServiceRole: {
      from: vi.fn(() => query({ data: null, error: null })),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    },
  } as any;
}
beforeEach(() => {
  vi.resetAllMocks();
  calls.models.mockResolvedValue([model()]);
  calls.root.mockResolvedValue({ ...agent(), workspaceId: "workspace" });
});
it("exports only provider and model ID and remaps agent defaults and role overrides on a different instance", async () => {
  const opts = options();
  calls.models.mockResolvedValueOnce([model(source)]);
  const exported = await getResourceExport("agent", "agent", opts);
  expect(exported.resource.references[0]?.externalModel).toEqual(descriptor);
  expect(JSON.stringify(exported)).not.toMatch(
    /secret|private.example|Authorization/,
  );
  const prepared = await prepareConfirmedResourceImport(
    [exported.resource],
    { workspaceId: "workspace" },
    {},
    opts,
  );
  expect(prepared[0].config).toMatchObject({
    modelIdentifier: "external:target",
    roles: [{ modelIdentifierOverride: "external:target" }],
  });
  expect(
    opts.supabaseServiceRole.from.mock.calls.every(
      ([name]: any) => name !== "ai_model_credentials",
    ),
  ).toBe(true);
});
it("deduplicates references across resources and auto-selects only the exact provider/model pair", async () => {
  calls.models.mockResolvedValue([
    model(),
    model("wrong-provider", "google"),
    model("wrong-model", "openai", "other"),
  ]);
  const r = resource();
  const other = { ...r, id: "test/other" };
  const result = await resolveExternalXRAGModels([r, other], options());
  expect(result.choices).toHaveLength(1);
  expect(result.choices[0]).toMatchObject({
    selectedIdentifier: "external:target",
    candidates: [
      { identifier: "external:target", name: "Target external:target" },
    ],
  });
  expect(calls.models).toHaveBeenCalledTimes(1);
});
it("requires a choice for ambiguous matches, including when the original identifier happens to exist", async () => {
  calls.models.mockResolvedValue([model(source), model("external:second")]);
  const opts = options();
  const result = await resolveExternalXRAGModels([resource()], opts);
  expect(result.choices[0]?.selectedIdentifier).toBeNull();
  await expect(
    prepareConfirmedResourceImport(
      [resource()],
      { workspaceId: "workspace" },
      {},
      opts,
    ),
  ).rejects.toThrow("XRAG_MODEL_SELECTION_REQUIRED");
  expect(opts.supabaseServiceRole.rpc).not.toHaveBeenCalled();
  const prepared = await prepareConfirmedResourceImport(
    [resource()],
    { workspaceId: "workspace" },
    {},
    opts,
    {
      [source]: "external:second",
    },
  );
  expect((prepared[0].config as any).modelIdentifier).toBe("external:second");
});
it("revalidates choices and rejects forged, removed or changed models before writing", async () => {
  for (const choices of [
    { [source]: "not-a-match" },
    { unrelated: "external:target" },
  ]) {
    const opts = options();
    await expect(
      prepareConfirmedResourceImport(
        [resource()],
        { workspaceId: "workspace" },
        {},
        opts,
        choices,
      ),
    ).rejects.toThrow("XRAG_MODEL_SELECTION_INVALID");
    expect(opts.supabaseServiceRole.rpc).not.toHaveBeenCalled();
  }
  calls.models.mockResolvedValue([model("external:target", "google")]);
  await expect(
    resolveExternalXRAGModels(
      [resource()],
      options(),
      { [source]: "external:target" },
      true,
    ),
  ).rejects.toThrow("XRAG_MODEL_SELECTION_INVALID");
});
it("imports missing models as unresolved without accidentally binding to an unrelated local identifier", async () => {
  calls.models.mockResolvedValue([model(source, "google")]);
  const opts = options();
  const result = await resolveExternalXRAGModels([resource()], opts, {}, true);
  expect(result.choices[0]?.candidates).toEqual([]);
  expect(result.mappings[source]).toMatch(/^external:missing:/);
  const prepared = await prepareConfirmedResourceImport(
    [resource()],
    { workspaceId: "workspace" },
    {},
    opts,
  );
  expect((prepared[0].config as any).modelIdentifier).toBe(
    result.mappings[source],
  );
});
it("keeps legacy references usable on the same instance but never guesses across instances", async () => {
  const r = resource();
  delete r.references[0]!.externalModel;
  calls.models.mockResolvedValue([model(source)]);
  expect(
    (await resolveExternalXRAGModels([r], options())).mappings[source],
  ).toBe(source);
  calls.models.mockResolvedValue([model()]);
  expect(
    (await resolveExternalXRAGModels([r], options(), {}, true)).choices[0],
  ).toMatchObject({ provider: null, modelId: source, candidates: [] });
});
it("does not query models for local references, rejects denied access and inconsistent descriptors", async () => {
  const r = resource();
  delete r.references[0]!.externalModel;
  r.references[0]!.identifier = "local";
  r.data.modelIdentifier = "local";
  (r.data.roles as any[])[0].modelIdentifierOverride = "local";
  expect(await resolveExternalXRAGModels([r], options())).toEqual({
    mappings: {},
    choices: [],
  });
  expect(calls.models).not.toHaveBeenCalled();
  await expect(
    resolveExternalXRAGModels([resource()], {
      ...options(),
      authenticated: { userId: "owner", claims: [] },
    }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  const other = resource();
  other.id = "other";
  other.references[0]!.externalModel = { provider: "google", modelId: "other" };
  await expect(
    resolveExternalXRAGModels([resource(), other], options()),
  ).rejects.toThrow("XRAG_INVALID_REFERENCES");
});
it("refuses to export an external reference whose source metadata is unavailable", async () => {
  calls.models.mockResolvedValue([]);
  await expect(getResourceExport("agent", "agent", options())).rejects.toThrow(
    "XRAG_REFERENCE_UNAVAILABLE",
  );
});

vi.mock("../packages/database/src/xrag/prepareXRAGTransfer.ts", () => ({
  prepareXRAGTransfer: async () => ({
    entries: calls.archives(),
    digest: "a".repeat(64),
  }),
}));
it("carries preview candidates and explicit model choices through the shared UI/MCP import coordinator", async () => {
  calls.models.mockResolvedValue([
    model("external:first"),
    model("external:second"),
  ]);
  calls.archives.mockReturnValue([
    { xrag: resource(), id: "archive", size: 1024 },
  ]);
  const opts = options();
  const backend = importBackend();
  calls.client = backend.client;
  const original = opts.supabaseServiceRole.rpc.getMockImplementation()!;
  opts.supabaseServiceRole.rpc.mockImplementation((name: string, args: any) =>
    ["begin_xrag_import", "commit_xrag_import"].includes(name)
      ? backend.client.rpc(name, args)
      : original(name, args),
  );
  opts.supabaseServiceRole.from = backend.client.from;
  const input = {
    source: {
      path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/agent.tar",
      digest: "a".repeat(64),
    },
    target: { workspaceId: "workspace" },
  };
  const preview = await previewXRAGImport(input, opts);
  expect(preview.externalModels[0]?.candidates).toHaveLength(2);
  expect(preview.entries[0]?.name).toBe("Agent");
  await expect(
    importXRAGTransfer({ ...input, confirmedRevisions: {} }, opts),
  ).rejects.toThrow("XRAG_MODEL_SELECTION_REQUIRED");
  await importXRAGTransfer(
    {
      ...input,
      confirmedRevisions: {},
      modelSelections: { [source]: "external:second" },
    },
    opts,
  );
  expect(
    ([...backend.jobs.values()][0].plan.entries[0].config as any)
      .modelIdentifier,
  ).toBe("external:second");
});
