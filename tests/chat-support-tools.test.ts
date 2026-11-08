import { beforeEach, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import { supportTools } from "../apps/realtime/src/chat/tools/support/tools.ts";
import { upsertActivity } from "../packages/realtime/src/documents/activity/upsertActivity.ts";
const state = vi.hoisted(() => ({
  documents: new Map<string, any>(),
  opened: vi.fn(),
  synced: vi.fn(),
}));
vi.mock("@schornio/aibox-realtime/server/ServerRealtimeProvider", () => ({
  ServerRealtimeProvider: class {
    document: Doc;
    constructor({ documentName }: { documentName: string }) {
      state.opened(documentName);
      this.document = state.documents.get(documentName);
    }
    async waitForSynced() {
      state.synced();
    }
    async [Symbol.asyncDispose]() {}
  },
}));
beforeEach(() => {
  state.opened.mockClear();
  state.synced.mockClear();
  for (const doc of state.documents.values()) doc.destroy();
  state.documents.clear();
});
const role = {
  id: "role",
  prompt: "",
  documentRepositoryMounts: [],
  toolChatAwareness: { active: true, updateChatLabel: true },
};
const context = {
  userId: "user",
  activityId: "activity",
  serverToken: "Worker test" as const,
  websocketProvider: {} as any,
};
it("sets only the calling user's current activity title and preserves explicit names", async () => {
  for (const user of ["user", "other"]) {
    const doc = new Doc();
    upsertActivity(doc, { id: "activity", label: "Original" });
    state.documents.set(`activity___${user}`, doc);
  }
  const tools = supportTools(role, context);
  const execute = tools["chat-set-label"]!.execute!;
  const options = { toolCallId: "label", messages: [] };
  expect(await execute({ label: "Useful title" }, options)).toEqual({
    ok: true,
    updated: true,
    label: "Useful title",
  });
  expect(state.opened).toHaveBeenCalledWith("activity___user");
  expect(
    state.documents.get("activity___other").getMap("activities").get("activity")
      .label,
  ).toBe("Original");
  upsertActivity(state.documents.get("activity___user"), {
    id: "activity",
    label: "Manual",
    labelUserInput: true,
  });
  expect(await execute({ label: "Automatic" }, options)).toEqual({
    ok: true,
    updated: false,
    label: "Manual",
  });
});
it("does not rename an activity after cancellation", async () => {
  const doc = new Doc();
  upsertActivity(doc, { id: "activity", label: "Original" });
  state.documents.set("activity___user", doc);
  const controller = new AbortController();
  controller.abort();
  await expect(
    supportTools(role, context)["chat-set-label"]!.execute!(
      { label: "New" },
      { toolCallId: "label", messages: [], abortSignal: controller.signal },
    ),
  ).rejects.toThrow();
  expect(doc.getMap<any>("activities").get("activity").label).toBe("Original");
});
