import { beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { aiboxModel } from "../packages/realtime/src/_lib/aiboxModel";
import { aiboxModelEmbedding } from "../packages/realtime/src/_lib/aiboxModelEmbedding";
import { getModelDoEmbed } from "../packages/realtime/src/documents/modelDoEmbed/getModelDoEmbed";
import { pushModelDoStreamPart } from "../packages/realtime/src/documents/modelDoStream/pushModelDoStreamPart";
import { setModelDoStreamDone } from "../packages/realtime/src/documents/modelDoStream/setModelDoStreamDone";
import { setModelDoStreamError } from "../packages/realtime/src/documents/modelDoStream/setModelDoStreamError";
const state = vi.hoisted(() => ({
  doc: undefined as any,
  disposed: vi.fn(),
  synced: vi.fn(),
  run: vi.fn(),
}));
vi.mock("../packages/realtime/src/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = state.doc;
    waitForSynced = state.synced;
    [Symbol.asyncDispose] = state.disposed;
  },
}));
vi.mock("../packages/realtime/src/documents/taskQueue/runTask", () => ({
  runTask: state.run,
}));
const context: any = { serverToken: "Worker tests", websocketProvider: {} };
beforeEach(() => {
  state.doc = new Doc();
  state.disposed.mockReset().mockResolvedValue(undefined);
  state.synced.mockReset().mockResolvedValue(undefined);
  state.run.mockReset();
});
describe("distributed model adapters", () => {
  it("forwards generation options, signal and required model capability", async () => {
    const model = aiboxModel("model", context);
    state.run.mockResolvedValue({ content: [{ type: "text", text: "Hello" }] });
    const abortSignal = new AbortController().signal;
    expect(
      await model.doGenerate({ prompt: [], abortSignal } as any),
    ).toMatchObject({ content: [{ text: "Hello" }] });
    expect(state.run).toHaveBeenCalledWith(
      "model-do-generate",
      { modelId: "model", prompt: [] },
      ["model"],
      { ...context, abortSignal },
    );
    expect(model).toMatchObject({
      specificationVersion: "v4",
      modelId: "model",
      provider: "aibox",
    });
    expect(
      model.supportedUrls["image/*"][0].test("data:image/png;base64,test"),
    ).toBe(true);
  });
  it("transports streaming parts and disposes on success", async () => {
    state.run.mockResolvedValue(undefined);
    const { stream } = await aiboxModel("model", context).doStream({
      prompt: [],
    } as any);
    const reader = stream.getReader();
    const part: any = { type: "text-delta", id: "part", delta: "Hello" };
    pushModelDoStreamPart(state.doc, part);
    setModelDoStreamDone(state.doc, 1);
    expect(await reader.read()).toEqual({ value: part, done: false });
    expect((await reader.read()).done).toBe(true);
    expect(state.disposed).toHaveBeenCalledOnce();
    expect(state.run.mock.lastCall![0]).toBe("model-do-stream");
  });
  it("disposes on remote stream errors", async () => {
    state.run.mockResolvedValue(undefined);
    const { stream } = await aiboxModel("model", context).doStream({
      prompt: [],
    } as any);
    const reader = stream.getReader();
    setModelDoStreamError(state.doc, "failed");
    await expect(reader.read()).rejects.toBe("failed");
    expect(state.disposed).toHaveBeenCalledOnce();
  });
  it("propagates task startup failures to the stream without an unhandled rejection", async () => {
    state.run.mockRejectedValue(new Error("worker unavailable"));
    const { stream } = await aiboxModel("model", context).doStream({
      prompt: [],
    } as any);
    await expect(stream.getReader().read()).rejects.toMatchObject({
      message: "worker unavailable",
    });
    expect(state.disposed).toHaveBeenCalledOnce();
  });
  it("cancels the remote task and connection when the reader cancels", async () => {
    state.run.mockResolvedValue(undefined);
    const { stream } = await aiboxModel("model", context).doStream({
      prompt: [],
    } as any);
    await stream.cancel();
    expect(state.run.mock.lastCall![3].abortSignal.aborted).toBe(true);
    expect(state.disposed).toHaveBeenCalledOnce();
  });
  it("publishes embedding inputs, waits for synchronization, returns embeddings and default warnings", async () => {
    state.run.mockImplementation(async () => {
      getModelDoEmbed(state.doc).result.setObject({
        embeddings: [[1, 2]],
        usage: { tokens: 2 },
      } as any);
    });
    const model = aiboxModelEmbedding("embed", context);
    const abortSignal = new AbortController().signal;
    expect(
      await model.doEmbed({ values: ["text"], abortSignal } as any),
    ).toEqual({ embeddings: [[1, 2]], usage: { tokens: 2 }, warnings: [] });
    expect(state.synced).toHaveBeenCalledTimes(2);
    expect(state.disposed).toHaveBeenCalledOnce();
    expect(getModelDoEmbed(state.doc).parameters.get("values")).toEqual([
      "text",
    ]);
    expect(state.run).toHaveBeenCalledWith(
      "model-do-embed",
      expect.objectContaining({ modelId: "embed", values: ["text"] }),
      ["embed"],
      { ...context, abortSignal },
    );
  });
  it("preserves embedding warnings and rejects missing results while disposing", async () => {
    state.run.mockImplementation(async () => {
      getModelDoEmbed(state.doc).result.setObject({
        embeddings: [],
        warnings: [{ type: "other", message: "warning" }],
      } as any);
    });
    expect(
      (
        await aiboxModelEmbedding("embed", context).doEmbed({
          values: [],
        } as any)
      ).warnings,
    ).toEqual([{ type: "other", message: "warning" }]);
    getModelDoEmbed(state.doc).result.delete("embeddings");
    state.run.mockResolvedValue(undefined);
    await expect(
      aiboxModelEmbedding("embed", context).doEmbed({ values: [] } as any),
    ).rejects.toThrow("no embeddings");
    expect(state.disposed).toHaveBeenCalledTimes(2);
  });
});
