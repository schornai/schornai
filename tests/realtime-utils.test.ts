import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { database } from "./helpers/supabase";
import { createSupabaseExtension } from "../packages/realtime/src/_lib/createSupabaseExtension";
import { getOllamaModelIdentifiers } from "../apps/realtime/src/_utils/getOllamaModelIdentifiers";
import { getReasoning } from "../apps/realtime/src/_utils/getReasoning";
import { waitForProviderSynced } from "../packages/realtime/src/_lib/waitForProviderSynced";
import {
  getActivityDocumentName,
  getActivitiesDocumentName,
  getActivityColor,
} from "../packages/realtime/src/documents/activity/_utils";
import { getChatDocumentName } from "../packages/realtime/src/documents/chat/_utils";
import { getChatCurrentMessageDocumentName } from "../packages/realtime/src/documents/chatCurrentMessage/_utils";
import {
  getStorageDocumentName,
  applyStorageLog,
} from "../packages/realtime/src/documents/storage/_utils";
import { getTaskQueueDocumentName } from "../packages/realtime/src/documents/taskQueue/_utils";
import { getModelDoStreamDocumentName } from "../packages/realtime/src/documents/modelDoStream/_utils";
import { getModelDoEmbedDocumentName } from "../packages/realtime/src/documents/modelDoEmbed/_utils";
import { getTranscribeDocumentName } from "../packages/realtime/src/documents/transcribe/_utils";
import { getReindexDocumentName } from "../packages/realtime/src/documents/reindex/_utils";

it("encodes every document namespace consistently", () => {
  expect(getActivitiesDocumentName({ userId: "u" })).toBe("activity___u");
  expect(getChatDocumentName({ activityId: "a", agentId: "g" })).toBe(
    "activity_chat___a_g",
  );
  expect(
    getChatCurrentMessageDocumentName({ activityId: "a", agentId: "g" }),
  ).toBe("activity_chat_currentMessage___a_g");
  expect(
    getTranscribeDocumentName({ activityId: "a", transcriberId: "t" }),
  ).toBe("activity_transcription__a_t");
  expect(getReindexDocumentName({ id: "a" })).toBe("index__a");
  expect(getModelDoStreamDocumentName({ id: "s" })).toBe("model_do_stream__s");
  expect(getModelDoEmbedDocumentName({ id: "e" })).toBe("model_do_embed__e");
  expect(getTaskQueueDocumentName()).toBe("taskQueue");
  const colors = new Map([
    ["g", { type: "color-oklch-hue", oklchHue: 1 }],
    ["t", { type: "color-oklch-hue", oklchHue: 2 }],
  ]) as any;
  for (const content of [
    { type: "chat", chatbotId: "g" },
    { type: "transcription", transcriberId: "t" },
    { type: "reindex" },
    undefined,
  ]) {
    const activity = { id: "a", content } as any;
    expect(getActivityDocumentName(activity)).toBe(
      content?.type === "chat"
        ? "activity_chat___a_g"
        : content?.type === "transcription"
          ? "activity_transcription__a_t"
          : content?.type === "reindex"
            ? "index__a"
            : undefined,
    );
    expect(getActivityColor(activity, colors)).toEqual(
      content?.type === "chat"
        ? colors.get("g")
        : content?.type === "transcription"
          ? colors.get("t")
          : undefined,
    );
    expect(getActivityColor(activity)).toBeUndefined();
  }
  expect(getActivityDocumentName()).toBeUndefined();
  expect(
    getStorageDocumentName({ type: "activity", activityId: "a", agentId: "g" }),
  ).toBe("storage___activity_a");
  expect(
    getStorageDocumentName({
      type: "activity-transcription",
      activityId: "a",
      transcriberId: "t",
    }),
  ).toBe("storage___activity_a");
  expect(
    getStorageDocumentName({
      type: "documentRepository",
      documentRepositoryId: "r",
      workspaceId: "w",
    }),
  ).toBe("storage___repo_w_r");
  expect(() => getStorageDocumentName({ type: "bad" } as any)).toThrow(
    "ExhaustiveError",
  );
});

it("applies only direct-child storage log entries and preserves input arrays", () => {
  const base = { file: true, name: "a", path: "folder/a" } as any;
  const entry = (path: string, state: string) =>
    ({
      id: path,
      sessionId: "s",
      state,
      target: { ...base, name: path.split("/").at(-1), path },
    }) as any;
  const items = [base];
  expect(
    applyStorageLog("folder", items, [entry("folder/b", "created")]).map(
      (f) => f.path,
    ),
  ).toEqual(["folder/a", "folder/b"]);
  expect(
    applyStorageLog("folder", items, [entry("folder/a", "processing")])[0]!
      .currentAction!.state,
  ).toBe("processing");
  expect(
    applyStorageLog("folder", items, [entry("folder/a", "uploading")])[0]!
      .currentAction!.state,
  ).toBe("uploading");
  expect(
    applyStorageLog("folder", items, [entry("folder/a", "error")])[0]!
      .currentAction!.state,
  ).toBe("error");
  expect(
    applyStorageLog("folder", items, [entry("folder/a", "removed")]),
  ).toEqual([]);
  expect(
    applyStorageLog("folder", items, [
      entry("other/a", "created"),
      entry("folder/deep/a", "created"),
      entry("folder", "created"),
      entry("folder/missing", "error"),
      entry("folder/missing", "removed"),
    ]),
  ).toEqual(items);
  expect(
    applyStorageLog("folder", items, [entry("folder/b", "created")], {
      newFiles: "ignore",
    }),
  ).toEqual(items);
  expect(applyStorageLog("", [], [entry("root", "created")])[0]!.path).toBe(
    "root",
  );
  expect(
    applyStorageLog("folder", items, [entry("folder-other/a", "created")]),
  ).toEqual(items);
  expect(items).toEqual([base]);
});

describe("service response validation", () => {
  it("rejects unsuccessful discovery rather than replacing capabilities with an empty list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("Unavailable", { status: 503 }),
    );
    await expect(
      getOllamaModelIdentifiers("http://ollama.test"),
    ).rejects.toThrow("HTTP 503");
  });
  it("preserves latest aliases and passes worker cancellation to discovery", async () => {
    const stop = new AbortController();
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        data: [
          { id: "model:latest" },
          { id: "model:latest" },
          { id: "model:27b" },
        ],
      }),
    );
    expect(
      await getOllamaModelIdentifiers("http://ollama.test", stop.signal),
    ).toEqual(["model:latest", "model", "model:27b"]);
    const requestSignal = vi.mocked(fetch).mock.calls[0][1]!.signal!;
    expect(requestSignal.aborted).toBe(false);
    stop.abort();
    expect(requestSignal.aborted).toBe(true);
  });
  it.each([
    null,
    {},
    { data: null },
    { data: [null, {}, { id: 42 }, { id: "model" }] },
  ])("extracts valid Ollama model identifiers from %j", async (body) => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => body });
    vi.stubGlobal("fetch", fetch);
    expect(await getOllamaModelIdentifiers("http://ollama.test")).toEqual(
      body && Array.isArray(body.data) ? ["model"] : [],
    );
    expect(fetch).toHaveBeenCalledWith("http://ollama.test/v1/models", {
      signal: expect.any(AbortSignal),
    });
  });
  it.each([
    "mandatory-off",
    "mandatory-on",
    "optional-off",
    "optional-on",
  ] as const)("respects thinking setting %s", (setting) => {
    for (const user of [false, true])
      expect(getReasoning(setting, user)).toBe(
        setting === "mandatory-on"
          ? "high"
          : setting === "mandatory-off"
            ? "none"
            : user
              ? "high"
              : "none",
      );
    expect(getReasoning(setting)).toBe(
      setting === "mandatory-on" ? "high" : "none",
    );
  });
});

describe("database-backed realtime persistence", () => {
  it("round-trips bytea and skips ephemeral documents", async () => {
    const { supabase, builders } = database({
      realtime_documents: { data: { document_data: "\\x000aff" } },
    });
    const extension = createSupabaseExtension({ supabase } as any);
    expect(
      await extension.configuration.fetch({ documentName: "chat" } as any),
    ).toEqual(new Uint8Array([0, 10, 255]));
    await extension.configuration.store({
      documentName: "chat",
      state: new Uint8Array([0, 10, 255]),
    } as any);
    expect(builders.realtime_documents!.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        document_name: "chat",
        document_data: "\\x000aff",
      }),
      { onConflict: "document_name" },
    );
    supabase.from.mockClear();
    for (const documentName of [
      "storage___x",
      "model_do_stream__x",
      "embeddings__x",
    ]) {
      expect(
        await extension.configuration.fetch({ documentName } as any),
      ).toBeNull();
      await extension.configuration.store({
        documentName,
        state: new Uint8Array(),
      } as any);
    }
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it("returns null for absent documents and propagates database errors", async () => {
    expect(
      await createSupabaseExtension({
        supabase: database({ realtime_documents: { data: null } }).supabase,
      } as any).configuration.fetch({ documentName: "chat" } as any),
    ).toBeNull();
    const error = new Error("read");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      createSupabaseExtension({
        supabase: database({ realtime_documents: { error } }).supabase,
      } as any).configuration.fetch({ documentName: "chat" } as any),
    ).rejects.toBe(error);
  });
});

it("resolves already-synced providers and rejects pre-aborted synchronization", async () => {
  const provider = Object.assign(new EventEmitter(), {
    isSynced: true,
    hasUnsyncedChanges: false,
  });
  await expect(waitForProviderSynced(provider as any)).resolves.toBeUndefined();
  await expect(
    waitForProviderSynced(provider as any, {
      abortSignal: AbortSignal.abort("cancelled"),
    }),
  ).rejects.toBe("cancelled");
});
