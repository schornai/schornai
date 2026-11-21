import { expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { nativeResourceId } from "../packages/xrag/src/identity.ts";
import { getModelExport } from "../packages/database/src/xrag/getModelExport.ts";
import { getModelExportSource } from "../packages/database/src/xrag/getModelExportSource.ts";

const stream = vi.hoisted(() =>
  vi.fn(async () => new Response("model bytes").body),
);
vi.mock("../packages/database/src/xrag/getArtifactStream.ts", () => ({
  getArtifactStream: stream,
}));

function fixture(role = "workspace-admin", artifactType = "ollamaModel") {
  const sourceIdentifier = "exported-original-model";
  const runtimeIdentifier = "local_registry.schorn.ai/library/example:latest";
  const model = {
    id: "model",
    identifier: sourceIdentifier,
    name: "Example",
    type: "ollama_llm_v1",
    config: { ollamaIdentifier: runtimeIdentifier },
  };
  const id = "a".repeat(64);
  const metadata = {
    id,
    name: "model.xrag.tar",
    size: 1024,
    createdAt: "2026-11-15T00:00:00.000Z",
    xrag: {
      xrag_version: 1,
      xrag_type: artifactType,
      modelName: "example",
      modelTag: "latest",
      meta: {
        identifier: sourceIdentifier,
        name: "Example",
        type: "ollama_llm_v1",
        contextSize: 4096,
        featureThinking: false,
        featureTools: true,
        featureVision: false,
      },
    },
  };
  const artifact = query({
    data: {
      id,
      metadata,
      created_at: metadata.createdAt,
      deleted_at: null,
      purged_at: null,
      object_path: "private/model.tar",
    },
    error: null,
  });
  return {
    runtimeIdentifier,
    sourceIdentifier,
    artifact,
    options: {
      supabase: {
        auth: {
          getClaims: vi.fn(async () => ({
            data: {
              claims: {
                organization_roles: [{ organization_id: "workspace", role }],
              },
            },
            error: null,
          })),
        },
        from: vi.fn(() => query({ data: model })),
      },
      supabaseServiceRole: { from: vi.fn(() => artifact) },
    },
  };
}

it("lets workspace admins export the exact model, using its publication identity", async () => {
  const { options, artifact, sourceIdentifier, runtimeIdentifier } = fixture();
  const result = await getModelExport("model", options as any);
  expect(artifact.eq).toHaveBeenCalledWith(
    "metadata->xrag->meta->>identifier",
    sourceIdentifier,
  );
  expect(result.resourceId).toBe(nativeResourceId("model", runtimeIdentifier));
  expect(stream).toHaveBeenCalledWith(
    "private/model.tar",
    expect.objectContaining({ supabase: options.supabaseServiceRole }),
  );
  expect(result).not.toHaveProperty("object_path");
});

it("does not let a reader reach the private artifact catalog", async () => {
  const { options } = fixture("user");
  await expect(getModelExport("model", options as any)).rejects.toThrow(
    "NOT_AUTHORIZED",
  );
  expect(options.supabaseServiceRole.from).not.toHaveBeenCalled();
  expect(stream).not.toHaveBeenCalled();
});

it("resumes the selected publication even when a newer version exists for the same model", async () => {
  const { options, artifact } = fixture();
  const digest = "a".repeat(64);
  const source = await getModelExportSource("model", options as any, digest);
  expect(artifact.eq).toHaveBeenCalledWith("id", digest);
  expect(artifact.eq).toHaveBeenCalledWith(
    "metadata->xrag->>xrag_type",
    "ollamaModel",
  );
  expect(artifact.order).not.toHaveBeenCalled();
  expect(source.id).toBe(digest);
});

it("never exports a platform update through the model export path", async () => {
  const { options } = fixture("workspace-admin", "setup");
  await expect(getModelExport("model", options as any)).rejects.toThrow(
    "MODEL_ARCHIVE_UNAVAILABLE",
  );
  expect(stream).not.toHaveBeenCalled();
});

it("rejects external models before reading the archive catalog", async () => {
  const { options } = fixture();
  options.supabase.from.mockReturnValueOnce(
    query({
      data: {
        id: "model",
        type: "external_llm_v1",
        name: "Hosted model",
        identifier: "external:model",
        config: {},
      },
    }),
  );
  await expect(getModelExport("model", options as any)).rejects.toThrow(
    "XRAG_MODEL_ARCHIVE_UNAVAILABLE",
  );
  expect(options.supabaseServiceRole.from).not.toHaveBeenCalled();
  expect(stream).not.toHaveBeenCalled();
});

it.each([{ data: null }, { error: new Error("private catalog error") }])(
  "does not open a model when its original archive is unavailable",
  async (result) => {
    const { options, artifact } = fixture();
    artifact.maybeSingle.mockResolvedValueOnce(result);
    await expect(getModelExport("model", options as any)).rejects.toThrow(
      "XRAG_MODEL_ARCHIVE_UNAVAILABLE",
    );
    expect(stream).not.toHaveBeenCalled();
  },
);

it("rejects an external model before inspecting privileged artifacts", async () => {
  const { options } = fixture();
  options.supabase.from.mockReturnValueOnce(
    query({
      data: {
        id: "remote",
        identifier: "external:remote",
        type: "external_llm_v1",
        config: {},
      },
    }),
  );
  await expect(getModelExport("remote", options as any)).rejects.toThrow(
    "MODEL_ARCHIVE_UNAVAILABLE",
  );
  expect(options.supabaseServiceRole.from).not.toHaveBeenCalled();
  expect(stream).not.toHaveBeenCalled();
});

it.each([
  ["missing", { data: null }],
  ["inaccessible", { error: { message: "private" } }],
] as const)(
  "rejects a %s original archive before opening any model bytes",
  async (_status, catalogResult) => {
    const { options } = fixture();
    options.supabaseServiceRole.from.mockReturnValueOnce(query(catalogResult));
    await expect(getModelExport("model", options as any)).rejects.toThrow(
      "MODEL_ARCHIVE_UNAVAILABLE",
    );
    expect(stream).not.toHaveBeenCalled();
  },
);
