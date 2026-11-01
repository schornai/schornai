import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it, vi } from "vitest";
import { getInstalledModels } from "../apps/transcriber-mac/src/service/getInstalledModels.ts";
const mocks = vi.hoisted(() => ({ models: vi.fn() }));
vi.mock("@schornio/aibox-database/aiModel/getAIModels", () => ({
  getAIModels: mocks.models,
}));
vi.mock("@schornio/aibox-database/_util/createSupabaseClient", () => ({
  createSupabaseClient: () => ({}),
}));

it("advertises only locally complete transcription models and refuses paths outside its installation", async () => {
  const root = await mkdtemp(join(tmpdir(), "service-models-"));
  vi.stubEnv("SCHORNAI_HOME", root);
  const model = (identifier: string, path: string) => ({
    type: "mlx_whisper_v1",
    identifier,
    config: { fileSystemIdentifier: path },
  });
  mocks.models.mockResolvedValue([
    model("installed", "ready"),
    model("missing-weights", "partial"),
    model("not-installed", "absent"),
    model("escape", "../../../outside"),
    { ...model("wrong-type", "ready"), type: "ollama_llm_v1" },
  ]);
  try {
    for (const name of ["ready", "partial"]) {
      const path = join(root, "mlx/whisper/models", name);
      await mkdir(path, { recursive: true });
      await writeFile(join(path, "config.json"), "{}");
      if (name === "ready")
        await writeFile(join(path, "weights.npz"), "weights");
    }
    expect(await getInstalledModels()).toEqual(["transcriber:installed"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
