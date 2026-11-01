vi.mock("@schornio/aibox-database/storage/getDocumentContent", () => ({
  getDocumentContent: mocks.savedContent,
}));
vi.mock("@schornio/aibox-database/storage/withStorageFileLock", () => ({
  withStorageFileLock: async (
    _storage: any,
    _path: any,
    _supabase: any,
    signal: any,
    operation: any,
  ) => operation(signal),
}));
import { Doc } from "yjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { modelDoGenerateWorker } from "../apps/realtime/src/modelDoGenerate/worker";
import { modelDoStreamWorker } from "../apps/realtime/src/modelDoStream/worker";
import { modelDoEmbedWorker } from "../apps/realtime/src/modelDoEmbed/worker";
import { processFileWorker } from "../apps/realtime/src/processFile/worker";
import { transcribeWorker } from "../apps/transcriber-mac/src/service/transcribeWorker";

const mocks = vi.hoisted(() => ({
  handler: undefined as any,
  modelIdentifiers: vi.fn(),
  taskType: "",
  taskConfig: undefined as any,
  docs: [] as any[],
  modelGenerate: vi.fn(),
  modelStream: vi.fn(),
  modelEmbed: vi.fn(),
  dispose: vi.fn(),
  inspect: vi.fn(),
  blob: vi.fn(),
  readFile: vi.fn(),
  savedContent: vi.fn(),
  save: vi.fn(),
  index: vi.fn(),
  repository: vi.fn(),
  model: vi.fn(),
  transcribe: vi.fn(),
  saveTranscription: vi.fn(),
  authorize: vi.fn(),
  log: vi.fn(),
  storage: undefined as any,
}));
vi.mock("@schornio/aibox-realtime/documents/taskQueue/TaskQueue", () => ({
  TaskQueue: class {
    constructor(type: string, config: unknown) {
      mocks.taskType = type;
      mocks.taskConfig = config;
    }
    handleTask(handler: unknown) {
      mocks.handler = handler;
      return Promise.resolve();
    }
  },
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock("@schornio/aibox-realtime/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document = mocks.docs.shift();
    static getServerToken(token: string) {
      return `Worker ${token}`;
    }
    waitForSynced() {
      return Promise.resolve();
    }
    [Symbol.asyncDispose]() {
      mocks.dispose();
      return Promise.resolve();
    }
  },
}));
vi.mock("ai-sdk-ollama", () => ({
  createOllama: () =>
    Object.assign(
      () => ({ doGenerate: mocks.modelGenerate, doStream: mocks.modelStream }),
      { embeddingModel: () => ({ doEmbed: mocks.modelEmbed }) },
    ),
}));
vi.mock("../apps/realtime/src/_utils/getOllamaModelIdentifiers", () => ({
  getOllamaModelIdentifiers: mocks.modelIdentifiers,
}));
vi.mock("@schornio/aibox-database/auth/createClientWithClaims", () => ({
  createClientWithClaims: mocks.authorize,
}));
vi.mock(
  "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      storage: unknown;
      constructor(config: any) {
        this.storage = config.storage;
        mocks.storage = this;
      }
      logAction = mocks.log;
      [Symbol.asyncDispose]() {
        mocks.dispose();
        return Promise.resolve();
      }
    },
  }),
);
vi.mock("@schornio/aibox-database/storage/inspect", () => ({
  inspect: mocks.inspect,
}));
vi.mock("@schornio/aibox-database/storage/getDocumentBlob", () => ({
  getDocumentBlob: mocks.blob,
}));
vi.mock("../apps/realtime/src/processFile/readFileContent", () => ({
  readFileContent: mocks.readFile,
}));
vi.mock("@schornio/aibox-database/storage/saveDocumentContent", () => ({
  saveDocumentContent: mocks.save,
}));
vi.mock("@schornio/aibox-database/storage/createIndex", () => ({
  createIndex: mocks.index,
}));
vi.mock(
  "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById",
  () => ({ getDocumentRepositoryById: mocks.repository }),
);
vi.mock("@schornio/aibox-realtime/_lib/aiboxModelEmbedding", () => ({
  aiboxModelEmbedding: (modelId: string) => ({ modelId }),
}));
vi.mock("@schornio/aibox-database/aiModel/getAIModelByIdentifier", () => ({
  getAIModelByIdentifier: mocks.model,
}));
vi.mock("../apps/transcriber-mac/src/service/runTranscriber", () => ({
  TranscriberProcess: class {
    transcribe = mocks.transcribe;
    async [Symbol.asyncDispose]() {}
  },
}));
vi.mock("@schornio/aibox-database/storage/createDocumentTranscription", () => ({
  createDocumentTranscription: mocks.saveTranscription,
}));

const config = { token: "token", workerIdentifier: "worker" };
const signal = new AbortController().signal;
const file = { file: true, name: "file.txt", path: "folder/file.txt" };
const task = {
  parameters: {
    userId: "u",
    userClaims: [],
    path: file.path,
    storage: { type: "activity", activityId: "activity", agentId: "agent" },
    modelIdentifier: "model",
    modelPrompt: "prompt",
  },
};
beforeEach(() => {
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockReset();
  vi.stubEnv("SUPABASE_JWT_SECRET", "worker-test-signing-secret");
  mocks.authorize.mockResolvedValue({ storage: {} });
  mocks.docs = [];
  mocks.modelIdentifiers.mockResolvedValue(["model"]);
  mocks.handler = undefined;
  mocks.inspect.mockResolvedValue(file);
  mocks.blob.mockResolvedValue(new Blob(["text"]));
  mocks.readFile.mockResolvedValue("converted");
  mocks.repository.mockResolvedValue({ id: "repo" });
  mocks.model.mockResolvedValue({
    type: "mlx_whisper_v1",
    config: { fileSystemIdentifier: "whisper" },
  });
  mocks.transcribe.mockResolvedValue({ segments: [] });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "time").mockImplementation(() => {});
  vi.spyOn(console, "timeEnd").mockImplementation(() => {});
});

describe("model workers", () => {
  it.each([
    [modelDoGenerateWorker, ["router-v1"]],
    [modelDoStreamWorker, []],
    [modelDoEmbedWorker, ["router-v1"]],
    [processFileWorker, ["router-v1"]],
  ] as const)(
    "refreshes installed models without restarting %s",
    async (worker, extra) => {
      await worker(config);
      expect(await mocks.taskConfig.capabilities(signal)).toEqual([
        "model",
        ...extra,
      ]);
      mocks.modelIdentifiers.mockResolvedValue(["new-model"]);
      expect(await mocks.taskConfig.capabilities(signal)).toEqual([
        "new-model",
        ...extra,
      ]);
      expect(mocks.modelIdentifiers).toHaveBeenLastCalledWith(
        "http://ollama.test",
        signal,
      );
    },
  );
  it("routes generation to a capable model and forwards cancellation", async () => {
    mocks.modelGenerate.mockResolvedValue({
      content: [{ type: "text", text: "result" }],
    });
    await modelDoGenerateWorker(config);
    expect(mocks.taskType).toBe("model-do-generate");
    expect(mocks.taskConfig).toMatchObject({
      capabilities: expect.any(Function),
      workerIdentifier: "worker",
      serverToken: "Worker token",
    });
    expect(
      await mocks.handler(
        { parameters: { modelId: "model", prompt: [] } },
        signal,
      ),
    ).toEqual({ content: [{ type: "text", text: "result" }] });
    expect(mocks.modelGenerate).toHaveBeenCalledWith({
      prompt: [],
      abortSignal: signal,
    });
  });
  it("streams ordered parts, marks completion count and disposes its document", async () => {
    const document = new Doc();
    mocks.docs.push(document);
    const chunks = [
      { type: "text-delta", id: "a", delta: "one" },
      { type: "text-delta", id: "a", delta: "two" },
    ];
    mocks.modelStream.mockResolvedValue({
      stream: new ReadableStream({
        start(controller) {
          chunks.forEach((c) => controller.enqueue(c));
          controller.close();
        },
      }),
    });
    await modelDoStreamWorker(config);
    await mocks.handler(
      {
        parameters: {
          modelId: "model",
          modelDoStreamDocumentId: "stream",
          prompt: [],
        },
      },
      signal,
    );
    expect(document.getArray("parts").toArray()).toEqual(chunks);
    expect(document.getMap("properties").toJSON()).toEqual({
      done: true,
      completeCount: 2,
    });
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it("persists stream failures and disposes the provider", async () => {
    const document = new Doc();
    mocks.docs.push(document);
    mocks.modelStream.mockRejectedValue("failed");
    await modelDoStreamWorker(config);
    await mocks.handler(
      { parameters: { modelId: "model", modelDoStreamDocumentId: "stream" } },
      signal,
    );
    expect(document.getMap("properties").get("error")).toBe("failed");
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it("embeds document parameters and rejects missing values", async () => {
    const document = new Doc();
    document.getMap("parameters").set("values", ["one"]);
    mocks.docs.push(document);
    mocks.modelEmbed.mockResolvedValue({ embeddings: [[1, 2]], warnings: [] });
    await modelDoEmbedWorker(config);
    await mocks.handler(
      { parameters: { modelId: "model", modelDoEmbedDocumentId: "embed" } },
      signal,
    );
    expect(mocks.modelEmbed).toHaveBeenCalledWith({
      values: ["one"],
      abortSignal: signal,
    });
    expect(document.getMap("result").toJSON()).toEqual({
      embeddings: [[1, 2]],
      warnings: [],
    });
    mocks.docs.push(new Doc());
    await expect(
      mocks.handler(
        { parameters: { modelId: "model", modelDoEmbedDocumentId: "empty" } },
        signal,
      ),
    ).rejects.toThrow("values empty");
    expect(mocks.dispose).toHaveBeenCalledTimes(2);
  });
});

describe("file processing worker", () => {
  it("saves direct text and indexes repository files using the configured embedding model", async () => {
    await processFileWorker(config);
    const repositoryTask = {
      parameters: {
        ...task.parameters,
        storage: { type: "documentRepository", documentRepositoryId: "repo" },
      },
    };
    await mocks.handler(repositoryTask, signal);
    expect(mocks.save).toHaveBeenCalledWith(
      file,
      { type: "mdc", current: "text", versions: [] },
      mocks.storage,
    );
    expect(mocks.index).toHaveBeenCalled();
    expect(mocks.index.mock.lastCall![4].embeddingModel("embedding")).toEqual({
      modelId: "embedding",
    });
    expect(mocks.readFile).not.toHaveBeenCalled();
  });
  it.each([
    { type: "mdc", current: "edited", versions: [] },
    { type: "transcript", textOverride: "edited", segments: [] },
  ])(
    "indexes saved content without extraction, transcription or rewriting: $type",
    async (content) => {
      mocks.savedContent.mockResolvedValue(content);
      await processFileWorker(config);
      await mocks.handler(
        {
          parameters: {
            ...task.parameters,
            useSavedContent: true,
            storage: {
              type: "documentRepository",
              documentRepositoryId: "repo",
            },
          },
        },
        signal,
      );
      expect(mocks.blob).not.toHaveBeenCalled();
      expect(mocks.readFile).not.toHaveBeenCalled();
      expect(mocks.save).not.toHaveBeenCalled();
      expect(mocks.transcribe).not.toHaveBeenCalled();
      expect(mocks.index.mock.lastCall![1]).toBe("edited");
    },
  );
  it("marks a processing task as failed when extracted content cannot be saved", async () => {
    mocks.save.mockResolvedValue(false);
    await processFileWorker(config);
    await expect(mocks.handler(task, signal)).rejects.toThrow(
      "Unable to save extracted content",
    );
    expect(mocks.index).not.toHaveBeenCalled();
  });
  it("extracts rich-text files and does not index activity files", async () => {
    mocks.inspect.mockResolvedValue({ ...file, path: "file.pdf" });
    await processFileWorker(config);
    await mocks.handler(task, signal);
    expect(mocks.readFile).toHaveBeenCalled();
    expect(mocks.save.mock.lastCall![1].current).toBe("converted");
    expect(mocks.index).not.toHaveBeenCalled();
    mocks.readFile.mockResolvedValue(undefined);
    mocks.save.mockClear();
    await expect(mocks.handler(task, signal)).rejects.toThrow(
      "Unable to extract",
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([undefined, { folder: true, path: "folder" }, file])(
    "rejects missing/non-file content %j",
    async (target) => {
      mocks.inspect.mockResolvedValue(target);
      mocks.blob.mockResolvedValue(undefined);
      await processFileWorker(config);
      await expect(mocks.handler(task, signal)).rejects.toThrow();
      expect(mocks.log).toHaveBeenCalledTimes(target ? 1 : 0);
      expect(mocks.save).not.toHaveBeenCalled();
    },
  );
});

it("reindexes copied corrected transcripts without extracting or overwriting them", async () => {
  mocks.savedContent.mockResolvedValue({
    type: "transcript",
    segments: [{ segmentOverride: "Corrected transcript", words: [] }],
  });
  await processFileWorker(config);
  await mocks.handler(
    {
      parameters: {
        ...task.parameters,
        storage: {
          type: "documentRepository",
          documentRepositoryId: "repo",
          workspaceId: "w",
        },
        reuseContent: true,
      },
    },
    signal,
  );
  expect(mocks.readFile).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.index).toHaveBeenCalledWith(
    file,
    "Corrected transcript",
    { id: "repo" },
    mocks.storage,
    expect.any(Object),
  );
});

describe("transcription worker", () => {
  it("transcribes valid audio and saves the result with cancellation", async () => {
    transcribeWorker(config);
    await mocks.handler(task, signal);
    expect(mocks.transcribe).toHaveBeenCalledWith({
      file: expect.any(Blob),
      modelIdentifier: "whisper",
      modelPrompt: "prompt",
      retryLevel: undefined,
      abortSignal: signal,
    });
    expect(mocks.saveTranscription).toHaveBeenCalledWith(
      file,
      { segments: [] },
      mocks.storage,
    );
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it("replaces repository indices with the newly transcribed text and reports indexing failures", async () => {
    mocks.transcribe.mockResolvedValue({
      segments: [{ words: [{ word: "Frisch" }] }],
    });
    transcribeWorker(config);
    const repositoryTask = {
      parameters: {
        ...task.parameters,
        storage: {
          type: "documentRepository",
          documentRepositoryId: "repo",
          workspaceId: "workspace",
        },
      },
    };
    await mocks.handler(repositoryTask, signal);
    expect(mocks.index).toHaveBeenCalledWith(
      file,
      "Frisch",
      { id: "repo" },
      mocks.storage,
      expect.objectContaining({ abortSignal: signal }),
    );
    mocks.index.mockRejectedValueOnce(new Error("index unavailable"));
    await expect(mocks.handler(repositoryTask, signal)).rejects.toThrow(
      "index unavailable",
    );
    expect(mocks.log).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: "error" }),
    );
  });
  it("rejects an absent storage target before invoking a model", async () => {
    mocks.inspect.mockResolvedValue(undefined);
    transcribeWorker(config);
    await expect(mocks.handler(task, signal)).rejects.toThrow("File not found");
    expect(mocks.transcribe).not.toHaveBeenCalled();
  });
  it.each(["missing-blob", "wrong-model", "model-error"])(
    "logs %s failures with the target",
    async (failure) => {
      if (failure === "missing-blob") mocks.blob.mockResolvedValue(undefined);
      if (failure === "wrong-model")
        mocks.model.mockResolvedValue({ type: "ollama_llm_v1" });
      if (failure === "model-error")
        mocks.transcribe.mockRejectedValue(new Error("failed"));
      transcribeWorker(config);
      await expect(mocks.handler(task, signal)).rejects.toThrow();
      expect(mocks.log).toHaveBeenLastCalledWith({
        state: "error",
        message: expect.any(String),
        target: file,
      });
      expect(mocks.saveTranscription).not.toHaveBeenCalled();
      expect(mocks.dispose).toHaveBeenCalledOnce();
    },
  );
});

it("rejects missing transcriber signing configuration before registering a worker", async () => {
  vi.stubEnv("SUPABASE_JWT_SECRET", undefined);
  vi.stubEnv("JWT_SECRET", undefined);
  await expect(transcribeWorker(config)).rejects.toThrow("SUPABASE_JWT_SECRET");
  expect(mocks.handler).toBeUndefined();
});
it("reports authorization initialization failures without leaking the original error", async () => {
  mocks.authorize.mockRejectedValue(new Error("private signing key value"));
  transcribeWorker(config);
  await expect(mocks.handler(task, signal)).rejects.toThrow(
    "initialize user authorization",
  );
  expect(console.error).toHaveBeenCalledWith(
    expect.stringContaining("JWT signing configuration"),
    expect.any(Object),
  );
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
    "private signing key value",
  );
  expect(mocks.transcribe).not.toHaveBeenCalled();
});
it("passes the selected retry level and preserves user authorization through saving", async () => {
  vi.stubEnv("SUPABASE_JWT_SECRET", undefined);
  vi.stubEnv("JWT_SECRET", "legacy-test-signing-secret");
  transcribeWorker(config);
  await mocks.handler(
    { ...task, parameters: { ...task.parameters, retryLevel: "balanced" } },
    signal,
  );
  expect(process.env.SUPABASE_JWT_SECRET).toBe("legacy-test-signing-secret");
  expect(mocks.authorize).toHaveBeenCalledWith(
    task.parameters.userId,
    task.parameters.userClaims,
  );
  expect(mocks.transcribe).toHaveBeenCalledWith(
    expect.objectContaining({ retryLevel: "balanced" }),
  );
  expect(mocks.saveTranscription).toHaveBeenCalled();
});
