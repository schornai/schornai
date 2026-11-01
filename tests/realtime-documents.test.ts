import { describe, expect, it, vi } from "vitest";
import { Doc, applyUpdate, encodeStateAsUpdate } from "yjs";
import { TypedYMap } from "../packages/realtime/src/_lib/TypedYMap";
import { getChat } from "../packages/realtime/src/documents/chat/getChat";
import { addChatMessage } from "../packages/realtime/src/documents/chat/addChatMessage";
import { updateChatMessage } from "../packages/realtime/src/documents/chat/updateChatMessage";
import { setChatState } from "../packages/realtime/src/documents/chat/setChatState";
import { addChatCurrentMessage } from "../packages/realtime/src/documents/chatCurrentMessage/addChatCurrentMessage";
import { getChatCurrentMessageBatch } from "../packages/realtime/src/documents/chatCurrentMessage/getChatCurrentMessageBatch";
import { addChatCurrentMessageFiles } from "../packages/realtime/src/documents/chatCurrentMessage/addChatCurrentMessageFiles";
import { patchChatCurrentMessage } from "../packages/realtime/src/documents/chatCurrentMessage/patchChatCurrentMessage";
import { deleteChatCurrentMessage } from "../packages/realtime/src/documents/chatCurrentMessage/deleteChatCurrentMessage";
import { setChatCurrentMessageState } from "../packages/realtime/src/documents/chatCurrentMessage/setChatCurrentMessageState";
import { claimNextChatCurrentMessage } from "../packages/realtime/src/documents/chatCurrentMessage/claimNextChatCurrentMessage";
import { normalizeChatCurrentMessage } from "../packages/realtime/src/documents/chatCurrentMessage/normalizeChatCurrentMessage";
import { getActivities } from "../packages/realtime/src/documents/activity/getActivities";
import { upsertActivity } from "../packages/realtime/src/documents/activity/upsertActivity";
import { deleteActivity } from "../packages/realtime/src/documents/activity/deleteActivity";
import { addTask } from "../packages/realtime/src/documents/taskQueue/addTask";
import { claimTask } from "../packages/realtime/src/documents/taskQueue/claimTask";
import { getTaskQueue } from "../packages/realtime/src/documents/taskQueue/getTaskQueue";
import { setTaskDone } from "../packages/realtime/src/documents/taskQueue/setTaskDone";
import { setTaskError } from "../packages/realtime/src/documents/taskQueue/setTaskError";
import { deleteTask } from "../packages/realtime/src/documents/taskQueue/deleteTask";
import { registerAbortTask } from "../packages/realtime/src/documents/taskQueue/registerAbortTask";
import { hasCapabilities } from "../packages/realtime/src/documents/taskQueue/_utils";
import { addStorageLog } from "../packages/realtime/src/documents/storage/addStorageLog";
import { getStorageLog } from "../packages/realtime/src/documents/storage/getStorageLog";
import { getModelDoStream } from "../packages/realtime/src/documents/modelDoStream/getModelDoStream";
import { pushModelDoStreamPart } from "../packages/realtime/src/documents/modelDoStream/pushModelDoStreamPart";
import { setModelDoStreamDone } from "../packages/realtime/src/documents/modelDoStream/setModelDoStreamDone";
import { setModelDoStreamError } from "../packages/realtime/src/documents/modelDoStream/setModelDoStreamError";
import { getModelDoGenerateReadableStream } from "../packages/realtime/src/documents/modelDoStream/getModelDoGenerateReadableStream";
import { getModelDoEmbed } from "../packages/realtime/src/documents/modelDoEmbed/getModelDoEmbed";
import { setModelDoEmbedParameters } from "../packages/realtime/src/documents/modelDoEmbed/setModelDoEmbedParameters";
import { setModelDoEmbedResult } from "../packages/realtime/src/documents/modelDoEmbed/setModelDoEmbedResult";

const message = {
  id: "m",
  role: "user" as const,
  parts: [{ type: "text" as const, text: "hello" }],
};

describe("Yjs chat persistence", () => {
  it("supports empty, seeded and absent documents", () => {
    expect(getChat()).toEqual({ messages: undefined, state: undefined });
    expect(getChat(new Doc()).messages!.toArray()).toEqual([]);
    const document = new Doc();
    addChatMessage(document, message);
    setChatState(document, { type: "idle" });
    expect(getChat(document).messages!.toArray()).toEqual([message]);
    expect(getChat(document).state!.get("type")).toBe("idle");
    addChatMessage(document, { ...message, id: "m2" });
    updateChatMessage(document, { ...message, parts: [] });
    updateChatMessage(document, { ...message, id: "m3" });
    expect(
      getChat(document)
        .messages!.toArray()
        .map((m) => m.id),
    ).toEqual(["m", "m2", "m3"]);
    expect(getChat(document).messages!.get(0).parts).toEqual([]);
    const replica = new Doc();
    applyUpdate(replica, encodeStateAsUpdate(document));
    expect(getChat(replica).messages!.toArray()).toEqual(
      getChat(document).messages!.toArray(),
    );
  });
  it("clears worker ownership when leaving generating", () => {
    const document = new Doc();
    setChatState(document, {
      type: "generating",
      claimedAtISO: "now",
      claimedWorkerId: "worker",
    });
    expect(getChat(document).state!.getObject()).toEqual({
      type: "generating",
      claimedAtISO: "now",
      claimedWorkerId: "worker",
    });
    setChatState(document, { type: "idle" });
    expect(getChat(document).state!.get("claimedWorkerId")).toBeUndefined();
  });
  it("observes typed maps and stops notifications after unsubscribing", () => {
    const document = new Doc();
    const map = new TypedYMap<{ a: number; b: string }>(
      document.getMap("typed"),
    );
    const listener = vi.fn();
    map.observe(listener);
    map.setObject({ a: 1, b: "two" });
    expect(map.getObject()).toEqual({ a: 1, b: "two" });
    expect(map.has("a")).toBe(true);
    expect(listener).toHaveBeenCalled();
    map.unobserve(listener);
    listener.mockClear();
    map.delete("a");
    map.set("b", "changed");
    expect(map.has("a")).toBe(false);
    expect(map.get("b")).toBe("changed");
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("current message queue", () => {
  it("adds, edits, attaches files and claims drafts without losing metadata", () => {
    const document = new Doc();
    const { messageId } = addChatCurrentMessage(document, {
      type: "text",
      text: "first",
    });
    const { messageId: approvalId } = addChatCurrentMessage(document, {
      type: "tool-approval",
      approvalId: "a",
      approved: true,
    });
    const batch = getChatCurrentMessageBatch(document);
    expect(batch.get(0).state).toBe("paused");
    const file = {
      file: true,
      name: "a.txt",
      path: "a.txt",
      size: 3,
      type: "text/plain",
    } as any;
    addChatCurrentMessageFiles(document, messageId, [file]);
    addChatCurrentMessageFiles(document, messageId, [file]);
    addChatCurrentMessageFiles(document, approvalId, [file]);
    addChatCurrentMessageFiles(document, "missing", [file]);
    for (const patch of [patchChatCurrentMessage]) {
      patch(document, messageId, { type: "text", text: "updated" });
      patch(document, "missing", { type: "text", text: "ignored" });
      patch(document, approvalId, { type: "text", text: "ignored" });
    }
    expect(batch.get(0).content).toEqual({
      type: "text",
      text: "updated",
      files: [file, file],
    });
    setChatCurrentMessageState(document, "missing", "queued");
    setChatCurrentMessageState(document, messageId, "queued");
    expect(
      claimNextChatCurrentMessage(document, { awaitingApproval: true }),
    ).toBeUndefined();
    setChatCurrentMessageState(document, approvalId, "submitted");
    expect(
      claimNextChatCurrentMessage(document, { awaitingApproval: true })!.id,
    ).toBe(approvalId);
    expect(claimNextChatCurrentMessage(document)!.id).toBe(messageId);
    expect(claimNextChatCurrentMessage(document)).toBeUndefined();
    const added = addChatCurrentMessage(document, { type: "text" });
    setChatCurrentMessageState(document, added.messageId, "queued");
    expect(batch.get(0).state).toBe("queued");
    deleteChatCurrentMessage(document, "missing");
    expect(batch.length).toBe(1);
    deleteChatCurrentMessage(document, added.messageId);
    expect(batch.length).toBe(0);
  });
  it("normalizes both legacy draft formats and rejects missing approval responses", () => {
    expect(
      normalizeChatCurrentMessage({
        id: "legacy",
        state: "queued",
        text: "text",
        thinking: true,
      } as any),
    ).toEqual({
      id: "legacy",
      state: "queued",
      content: { type: "text", text: "text", thinking: true, files: undefined },
    });
    expect(
      normalizeChatCurrentMessage({
        id: "legacy",
        state: "queued",
        content: {
          type: "tool-approval",
          approvals: [{ approvalId: "a", approved: false }],
          thinking: true,
        },
      } as any).content,
    ).toEqual({
      type: "tool-approval",
      approvalId: "a",
      approved: false,
      thinking: true,
    });
    expect(() =>
      normalizeChatCurrentMessage({
        content: { type: "tool-approval", approvals: [] },
      } as any),
    ).toThrow("TOOL_APPROVAL_RESPONSE_MISSING");
  });
});

describe("activities and storage logs", () => {
  it("preserves creation dates and changes update dates only for nonminor edits", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    const document = new Doc();
    upsertActivity(document, { id: "a" }, { labelOnInsert: "New" });
    upsertActivity(document, { id: "b" });
    const { activities } = getActivities(document);
    const original = activities.get("a")!;
    expect(original).toMatchObject({
      label: "New",
      pinned: false,
      state: "idle",
    });
    expect(activities.get("b")!.label).toBe("");
    vi.advanceTimersByTime(1000);
    upsertActivity(document, { id: "a", pinned: true }, { minorChange: true });
    expect(activities.get("a")!.updatedAtISO).toBe(original.updatedAtISO);
    upsertActivity(document, { id: "a", label: "Changed" });
    expect(activities.get("a")!.updatedAtISO).not.toBe(original.updatedAtISO);
    expect(activities.get("a")!.createdAtISO).toBe(original.createdAtISO);
    deleteActivity(document, "a");
    deleteActivity(document, "missing");
    expect([...activities.keys()]).toEqual(["b"]);
  });
  it("upserts logs by session and path, retaining IDs", () => {
    const document = new Doc();
    const log = {
      sessionId: "one",
      state: "uploading",
      target: { file: true, name: "a", path: "folder/a" },
    } as any;
    addStorageLog(document, log);
    const id = getStorageLog(document).get(0).id;
    addStorageLog(document, { ...log, state: "created" });
    addStorageLog(document, { ...log, sessionId: "two" });
    expect(getStorageLog(document).length).toBe(2);
    expect(getStorageLog(document).get(0)).toMatchObject({
      id,
      state: "created",
    });
  });
});

describe("task queue state machine", () => {
  const task = (id: string, requiredCapabilities: string[] = []) => ({
    id,
    requiredCapabilities,
    state: "pending" as const,
    type: "chat" as const,
    parameters: {
      agentId: "agent",
      activityId: "activity",
      userId: "user",
      userClaims: [],
    },
  });
  it("claims only matching task types and capabilities, exactly once", () => {
    const document = new Doc();
    addTask(document, task("gpu", ["gpu"]));
    addTask(document, task("cpu"));
    expect(
      claimTask(document, "worker", "transcribe", ["gpu"]),
    ).toBeUndefined();
    expect(claimTask(document, "worker", "chat", [])).toMatchObject({
      id: "cpu",
      state: "claimed",
      claimedBy: "worker",
    });
    expect(claimTask(document, "worker", "chat", [])).toBeUndefined();
    expect(claimTask(document, "worker", "chat", ["gpu"])!.id).toBe("gpu");
    setTaskDone(document, "cpu", undefined);
    setTaskError(document, "gpu", new Error("failed"));
    expect(getTaskQueue(document).tasks.toArray()).toMatchObject([
      { state: "error", error: "Error: failed" },
      { state: "finished" },
    ]);
    setTaskDone(document, "missing", undefined);
    setTaskError(document, "missing", "error");
    deleteTask(document, "missing");
    deleteTask(document, "gpu");
    expect(
      getTaskQueue(document)
        .tasks.toArray()
        .map((t) => t.id),
    ).toEqual(["cpu"]);
    expect(hasCapabilities({ check: ["a"], required: ["a", "a"] })).toBe(true);
    expect(hasCapabilities({ check: [], required: ["a"] })).toBe(false);
  });
  it("marks an aborted task once and supports explicit unregistration and missing IDs", () => {
    const document = new Doc();
    addTask(document, task("a"));
    const controller = new AbortController();
    registerAbortTask(document, "a", controller.signal);
    controller.abort();
    expect(getTaskQueue(document).abortRequests.has("a")).toBe(true);
    const removed = new AbortController();
    registerAbortTask(document, "a", removed.signal).unregisterAbortTask();
    removed.abort();
    const missing = new AbortController();
    registerAbortTask(document, "missing", missing.signal);
    missing.abort();
    expect(getTaskQueue(document).tasks.length).toBe(1);
  });
});

describe("model documents", () => {
  it("stores embedding parameters and results in separate maps", () => {
    const document = new Doc();
    const params = { values: ["one", "two"] };
    const result = {
      embeddings: [
        [1, 2],
        [3, 4],
      ],
      warnings: [],
    };
    setModelDoEmbedParameters(document, params);
    setModelDoEmbedResult(document, result as any);
    expect(getModelDoEmbed(document).parameters.getObject()).toEqual(params);
    expect(getModelDoEmbed(document).result.getObject()).toEqual(result);
  });
  it("streams ordered chunks, waits for the complete count and calls completion once", async () => {
    const document = new Doc();
    const onStreamDone = vi.fn();
    const stream = getModelDoGenerateReadableStream(document, { onStreamDone });
    const reader = stream.getReader();
    pushModelDoStreamPart(document, {
      type: "text-delta",
      id: "a",
      delta: "hello",
    });
    expect((await reader.read()).value).toMatchObject({ delta: "hello" });
    setModelDoStreamDone(document, 2);
    expect(onStreamDone).not.toHaveBeenCalled();
    pushModelDoStreamPart(document, {
      type: "text-delta",
      id: "a",
      delta: " world",
    });
    expect((await reader.read()).value).toMatchObject({ delta: " world" });
    expect(await reader.read()).toEqual({ done: true, value: undefined });
    expect(onStreamDone).toHaveBeenCalledOnce();
    expect(getModelDoStream(document).properties.get("done")).toBe(true);
  });
  it("propagates stream errors and unregisters observers", async () => {
    const document = new Doc();
    const onStreamError = vi.fn();
    const reader = getModelDoGenerateReadableStream(document, {
      onStreamError,
    }).getReader();
    setModelDoStreamError(document, "stream failed");
    await expect(reader.read()).rejects.toBe("stream failed");
    expect(onStreamError).toHaveBeenCalledWith("stream failed");
    pushModelDoStreamPart(document, {
      type: "text-delta",
      id: "a",
      delta: "ignored",
    });
    expect(onStreamError).toHaveBeenCalledOnce();
  });
});
