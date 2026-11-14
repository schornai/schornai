import { Doc } from "yjs";
import { getAutomationRunsDocumentName } from "../packages/database/src/automation/_realtime";
import { getAutomationRunsUpdates } from "../packages/realtime/src/documents/automationRuns/_schema";
import { beforeEach, expect, it, vi } from "vitest";
import { runAutomation } from "../apps/realtime/src/scheduler/runAutomation.ts";
const io = vi.hoisted(() => ({
  ready: vi.fn(),
  begin: vi.fn(),
  finish: vi.fn(),
  definition: vi.fn(),
  owner: vi.fn(),
  client: vi.fn(),
  agent: vi.fn(),
  access: vi.fn(),
  send: vi.fn(),
}));
vi.mock("@schornio/aibox-database/automation/automationFileIsReady", () => ({
  automationFileIsReady: io.ready,
}));
vi.mock("@schornio/aibox-database/automation/beginAutomationRun", () => ({
  beginAutomationRun: io.begin,
}));
vi.mock("@schornio/aibox-database/automation/finishAutomationRun", () => ({
  finishAutomationRun: io.finish,
}));
vi.mock("@schornio/aibox-database/automation/getAutomationForRun", () => ({
  getAutomationForRun: io.definition,
}));
vi.mock("@schornio/aibox-database/automation/getAutomationOwner", () => ({
  getAutomationOwner: io.owner,
}));
vi.mock("@schornio/aibox-database/auth/createClientWithClaims", () => ({
  createClientWithClaims: io.client,
}));
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: io.agent,
}));
vi.mock("@schornio/aibox-database/storage/requireStorageAccess", () => ({
  requireStorageAccess: io.access,
}));
vi.mock("@schornio/aibox-realtime/platform/sendChatMessage", () => ({
  sendChatMessage: io.send,
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
const id = "aae00000-0000-4000-8000-000000000001";
const run = {
  id,
  automation_id: id,
  revision: "revision",
  activity_id: "activity",
  event: { type: "uploaded", path: "inbox/file.pdf" },
};
const definition = {
  enabled: true,
  revision: "revision",
  user_id: "owner",
  agent_id: "agent",
  message: "Summarize",
  access_level: "editor",
  trigger: { type: "time" },
};
const job = {
  payload: { runId: id },
  lease_token: "token",
  attempts: 1,
  max_attempts: 100,
} as any;
const documents = new Map<string, Doc>();
const options = {
  supabase: {} as any,
  serverToken: "Worker secret" as const,
  instance: { documents } as any,
};
beforeEach(() => {
  vi.resetAllMocks();
  for (const doc of documents.values()) doc.destroy();
  documents.clear();
  io.ready.mockResolvedValue(true);
  io.begin.mockResolvedValue(run);
  io.definition.mockResolvedValue(definition);
  io.owner.mockResolvedValue([
    { organization_id: "workspace", role: "editor" },
  ]);
  io.agent.mockResolvedValue({ id: "agent", workspaceId: "workspace" });
  io.client.mockResolvedValue({});
});
const execute = () => runAutomation(job, new AbortController().signal, options);
it("submits a new personal chat under current permissions and the saved MCP ceiling", async () => {
  await execute();
  expect(io.send).toHaveBeenCalledExactlyOnceWith(
    {
      agentId: "agent",
      newActivityId: "activity",
      text: "Summarize",
      files: [],
    },
    expect.objectContaining({
      userId: "owner",
      level: "editor",
      claims: [{ organization_id: "workspace", role: "editor" }],
    }),
  );
  expect(io.finish).toHaveBeenCalledWith(id, "queued", options);
});
it("retries file readiness before the durable fence and never replays an already started run", async () => {
  io.ready.mockResolvedValue(false);
  await expect(execute()).rejects.toThrow("AUTOMATION_FILE_PENDING");
  expect(io.begin).not.toHaveBeenCalled();
  io.ready.mockResolvedValue(true);
  io.begin.mockResolvedValue(null);
  await execute();
  expect(io.send).not.toHaveBeenCalled();
});
it("honors ownership revocation, version cancellation and storage authorization", async () => {
  for (const value of [
    null,
    { ...definition, enabled: false },
    { ...definition, revision: "changed" },
  ]) {
    io.definition.mockResolvedValue(value);
    await execute();
    expect(io.finish).toHaveBeenLastCalledWith(id, "failed", options);
  }
  io.definition.mockResolvedValue(definition);
  io.owner.mockResolvedValue([]);
  await execute();
  expect(io.send).not.toHaveBeenCalled();
});
it.each(["copy", "reference", "none"])(
  "preserves the %s attachment selection",
  async (attachment) => {
    const storage = {
      type: "documentRepository",
      workspaceId: "workspace",
      documentRepositoryId: "repo",
    };
    io.definition.mockResolvedValue({
      ...definition,
      trigger: { type: "storage", storage, attachment },
    });
    await execute();
    expect(io.access).toHaveBeenCalledWith(storage, "read", { supabase: {} });
    expect(io.send).toHaveBeenCalledWith(
      expect.objectContaining({
        files:
          attachment === "none"
            ? []
            : [{ storage, path: "inbox/file.pdf", attachmentMode: attachment }],
        text: expect.stringContaining("inbox/file.pdf"),
      }),
      expect.anything(),
    );
  },
);
it("does not attach deleted files and records errors without leaking details", async () => {
  io.definition.mockResolvedValue({
    ...definition,
    trigger: { type: "storage", storage: {}, attachment: "copy" },
  });
  io.begin.mockResolvedValue({
    ...run,
    event: { type: "deleted", path: "deleted.pdf" },
  });
  await execute();
  expect(io.send).toHaveBeenCalledWith(
    expect.objectContaining({ files: [] }),
    expect.anything(),
  );
  io.send.mockRejectedValue(new Error("private connection details"));
  await execute();
  expect(io.finish).toHaveBeenLastCalledWith(id, "failed", options);
});
it("does not start work after cancellation and records exhausted readiness failures", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    runAutomation(job, controller.signal, options),
  ).rejects.toThrow();
  expect(io.begin).not.toHaveBeenCalled();
  io.ready.mockRejectedValue(new Error("authorization failure"));
  io.owner.mockRejectedValue(new Error("revoked"));
  await execute();
  expect(io.finish).toHaveBeenLastCalledWith(id, "failed", options);
  io.ready.mockResolvedValue(false);
  await runAutomation(
    { ...job, attempts: 100 },
    new AbortController().signal,
    options,
  );
  expect(io.finish).toHaveBeenLastCalledWith(id, "failed", options);
});
it("runs paused definitions only for explicit manual requests with the caller's access ceiling", async () => {
  io.begin.mockResolvedValue({
    ...run,
    occurrence: "manual:request",
    event: { type: "manual", path: "", accessLevel: "editor" },
  });
  io.definition.mockResolvedValue({
    ...definition,
    enabled: false,
    access_level: "admin",
    trigger: { type: "storage", attachment: "none", storage: {} },
  });
  await execute();
  expect(io.send).toHaveBeenCalledWith(
    expect.objectContaining({ text: "Summarize", files: [] }),
    expect.objectContaining({ level: "editor" }),
  );
  expect(io.finish).toHaveBeenCalledWith(id, "queued", options);
});

it("pushes run changes through the existing Yjs document after committed state transitions", async () => {
  const document = new Doc();
  const unrelated = new Doc();
  documents.set(getAutomationRunsDocumentName(id), document);
  documents.set("services", unrelated);
  const states: string[] = [];
  let state = "pending";
  getAutomationRunsUpdates(document).observe(() => states.push(state));
  io.begin.mockImplementation(async () => {
    state = "started";
    return run;
  });
  io.finish.mockImplementation(async (_id, next) => {
    state = next;
  });
  await execute();
  expect(states).toEqual(["pending", "started", "queued"]);
  expect(unrelated.share.size).toBe(0);
  expect([...getAutomationRunsUpdates(document).keys()]).toEqual(["revision"]);
});

it("notifies existing run views when execution fails or the start fence cancels a run", async () => {
  const document = new Doc();
  documents.set(getAutomationRunsDocumentName(id), document);
  const updated = vi.fn();
  getAutomationRunsUpdates(document).observe(updated);
  io.send.mockRejectedValue(new Error("failed"));
  await execute();
  expect(io.finish).toHaveBeenCalledWith(id, "failed", options);
  expect(updated).toHaveBeenCalledTimes(3);
  updated.mockClear();
  io.begin.mockResolvedValue(null);
  await execute();
  expect(updated).toHaveBeenCalledTimes(2);
});

it("delivers the worker's final revision to a read-only browser over a real Yjs websocket", async () => {
  const { Server } = await import("@hocuspocus/server");
  const { HocuspocusProvider, HocuspocusProviderWebsocket } =
    await import("@hocuspocus/provider");
  const { waitForProviderSynced } =
    await import("../packages/realtime/src/_lib/waitForProviderSynced");
  const name = getAutomationRunsDocumentName(id);
  const server = new Server({
    address: "127.0.0.1",
    port: 0,
    quiet: true,
    stopOnSignals: false,
    async onAuthenticate({ token, documentName, connectionConfig }) {
      if (token !== "test-owner" || documentName !== name)
        throw new Error("Unauthorized");
      connectionConfig.readOnly = true;
    },
  });
  await server.listen();
  const socket = new HocuspocusProviderWebsocket({ url: server.webSocketURL });
  const document = new Doc();
  const provider = new HocuspocusProvider({
    name,
    document,
    token: "test-owner",
    websocketProvider: socket,
  });
  provider.attach();
  try {
    await waitForProviderSynced(provider, {
      abortSignal: AbortSignal.timeout(5000),
    });
    await runAutomation(job, new AbortController().signal, {
      ...options,
      instance: server.hocuspocus,
    });
    const revision = getAutomationRunsUpdates(
      server.hocuspocus.documents.get(name)!,
    ).get("revision");
    expect(revision).toBeTruthy();
    await vi.waitFor(() =>
      expect(getAutomationRunsUpdates(document).get("revision")).toBe(revision),
    );
    expect(io.finish).toHaveBeenCalledWith(id, "queued", expect.anything());
  } finally {
    provider.destroy();
    socket.destroy();
    document.destroy();
    await server.destroy();
  }
});
