import { beforeEach, expect, it, vi } from "vitest";
import {
  platformRegistry,
  type PlatformContext,
} from "../packages/realtime/src/platform/registry.ts";
import { addXRAGTools } from "../packages/realtime/src/platform/xragTools.ts";
import { database } from "./helpers/supabase.ts";
const calls = vi.hoisted(() => ({
  import: vi.fn(async () => ({
    workspaceId: "workspace",
    imported: [],
    publications: [],
  })),
  workspaces: vi.fn(async () => [{ id: "workspace" }]),
  export: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@schornio/aibox-database/xrag/importXRAGTransfer", () => ({
  importXRAGTransfer: calls.import,
}));
vi.mock("@schornio/aibox-database/workspace/getWorkspaces", () => ({
  getWorkspaces: calls.workspaces,
}));
vi.mock("@schornio/aibox-database/xrag/exportXRAG", () => ({
  exportXRAG: calls.export,
}));
vi.mock("@schornio/aibox-database/xrag/getXRAGExportDownload", () => ({
  getXRAGExportDownload: calls.download,
}));
const input = {
  source: {
    path: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/archive.tar",
    digest: "a".repeat(64),
  },
  target: { workspaceId: "workspace" },
  confirmedRevisions: {},
};
function catalog(
  claims: PlatformContext["claims"],
  level: PlatformContext["level"],
  approvals?: PlatformContext["approvals"],
  overrides: {
    supabase?: object;
    xragDownloadUrl?: PlatformContext["xragDownloadUrl"];
  } = {},
) {
  const context = {
    claims,
    level,
    approvals,
    userId: "11111111-1111-4111-8111-111111111111",
    supabase: {},
    supabaseServiceRole: {},
    serverToken: "Worker token",
    websocketProvider: {},
    ...overrides,
  } as PlatformContext;
  const registry = platformRegistry(context);
  addXRAGTools(context, registry);
  return registry.tools;
}
beforeEach(() => vi.clearAllMocks());
it("offers XRAG operations only to workspace administrators and above", () => {
  expect(
    catalog([{ organization_id: "workspace", role: "editor" }], "editor"),
  ).toEqual([]);
  const tools = catalog(
    [{ organization_id: "workspace", role: "workspace-admin" }],
    "workspace",
  );
  expect(tools.map((tool) => tool.name)).toContain("platform_xrag_import");
  expect(tools.map((tool) => tool.name)).not.toContain(
    "platform_xrag_import_admin",
  );
});
it("attenuates even global administrators for the resource-only import tool", async () => {
  const tool = catalog("admin", "admin").find(
    (tool) => tool.name === "platform_xrag_import",
  )!;
  await tool.execute(input);
  expect(calls.import).toHaveBeenCalledWith(
    input,
    expect.objectContaining({
      authenticated: {
        userId: "11111111-1111-4111-8111-111111111111",
        claims: [{ organization_id: "workspace", role: "workspace-admin" }],
      },
    }),
  );
});
it("retains global authorization only for the explicitly administrative import tool", async () => {
  const tool = catalog("admin", "admin").find(
    (tool) => tool.name === "platform_xrag_import_admin",
  )!;
  await tool.execute(input);
  expect(calls.import).toHaveBeenCalledWith(
    input,
    expect.objectContaining({
      authenticated: {
        userId: "11111111-1111-4111-8111-111111111111",
        claims: "admin",
      },
    }),
  );
  expect(calls.workspaces).not.toHaveBeenCalled();
});
it("respects a global administrator's workspace ceiling and disabled admin tools", () => {
  expect(
    catalog("admin", "workspace").some(
      (tool) => tool.name === "platform_xrag_import_admin",
    ),
  ).toBe(false);
  expect(
    catalog("admin", "admin", {
      user: "auto",
      editor: "auto",
      workspace: "auto",
      admin: "off",
    }).some((tool) => tool.name === "platform_xrag_import_admin"),
  ).toBe(false);
});
it("validates the preview digest before invoking a mutation", async () => {
  const tool = catalog("admin", "admin").find(
    (tool) => tool.name === "platform_xrag_import",
  )!;
  await expect(
    tool.execute({ ...input, source: { path: input.source.path } }),
  ).rejects.toThrow();
  expect(calls.import).not.toHaveBeenCalled();
});

function modelPackageTools(modelType: string) {
  const packageId = "22222222-2222-4222-8222-222222222222";
  const selection = { kind: "model", id: "model" };
  const { supabase, builders } = database({
    ai_models: {
      data: {
        id: selection.id,
        name: "Model",
        type: modelType,
        config: { ollamaIdentifier: "example:latest" },
      },
    },
    xrag_packages: { data: [{ id: packageId, xrag_package_items: [] }] },
    xrag_package_items: {},
  });
  const tools = catalog(
    [{ organization_id: "workspace", role: "workspace-admin" }],
    "workspace",
    undefined,
    { supabase },
  );
  const choices = tools.find(
    (tool) => tool.name === "platform_xrag_related_objects",
  )!;
  const add = tools.find(
    (tool) => tool.name === "platform_xrag_saved_package_add",
  )!;
  return {
    packageId,
    getRelated: () => choices.execute(selection),
    addModel: () => add.execute({ packageId, selection }),
    upsert: builders.xrag_package_items!.upsert,
  };
}

it("allows a workspace administrator to select a registered local model directly", async () => {
  const model = modelPackageTools("ollama_llm_v1");
  await expect(model.getRelated()).resolves.toEqual([]);
  await model.addModel();
  expect(model.upsert).toHaveBeenCalledWith(
    [
      {
        package_id: model.packageId,
        resource_id: "model",
        kind: "model",
        name: "Model",
      },
    ],
    { onConflict: "package_id,kind,resource_id" },
  );
});

it("rejects direct selection of an external API model before changing the package", async () => {
  const model = modelPackageTools("external_llm_v1");
  await expect(model.getRelated()).rejects.toThrow(
    "XRAG_MODEL_ARCHIVE_UNAVAILABLE",
  );
  await expect(model.addModel()).rejects.toThrow(
    "XRAG_MODEL_ARCHIVE_UNAVAILABLE",
  );
  expect(model.upsert).not.toHaveBeenCalled();
});

it("keeps export metadata and exposes a usable download URL for both kinds of export", async () => {
  const file = {
    name: "file.xrag.tar",
    path: "transfer/path",
    size: 50,
    url: "internal",
  };
  const xragPackage = { name: "package.xrag.tar", url: "internal" };
  calls.export.mockResolvedValue(file);
  calls.download.mockResolvedValue(xragPackage);
  const tools = catalog("admin", "admin", undefined, {
    xragDownloadUrl: () => "public",
  });
  const single = tools.find((tool) => tool.name === "platform_xrag_export")!;
  const saved = tools.find(
    (tool) => tool.name === "platform_xrag_export_download",
  )!;
  await expect(single.execute({ kind: "model", id: "model" })).resolves.toEqual(
    { ...file, url: "public" },
  );
  await expect(
    saved.execute({ jobId: "11111111-1111-4111-8111-111111111111" }),
  ).resolves.toEqual({ ...xragPackage, url: "public" });
  const native = catalog("admin", "admin").find(
    (tool) => tool.name === "platform_xrag_export",
  )!;
  await expect(native.execute({ kind: "model", id: "model" })).resolves.toEqual(
    file,
  );
});

it("requires agent consent for both import tools even when workspace and admin actions are automatic", () => {
  const tools = catalog("admin", "admin", {
    user: "auto",
    editor: "auto",
    workspace: "auto",
    admin: "auto",
  });
  for (const name of ["platform_xrag_import", "platform_xrag_import_admin"])
    expect(tools.find((tool) => tool.name === name)?.approval?.(input)).toBe(
      "ask",
    );
  for (const name of ["platform_xrag_inspect", "platform_xrag_preview"])
    expect(tools.find((tool) => tool.name === name)?.readOnly).toBe(false);
});
