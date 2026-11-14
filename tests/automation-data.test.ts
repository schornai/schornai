import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { query } from "./helpers/supabase.ts";
import { saveAutomation } from "../packages/database/src/automation/saveAutomation.ts";
import { getAutomations } from "../packages/database/src/automation/getAutomations.ts";
import { deleteAutomation } from "../packages/database/src/automation/deleteAutomation.ts";
import { getAutomationRuns } from "../packages/database/src/automation/getAutomationRuns.ts";
import { dispatchAutomationTimes } from "../packages/database/src/automation/dispatchAutomationTimes.ts";
import { beginAutomationRun } from "../packages/database/src/automation/beginAutomationRun.ts";
import { finishAutomationRun } from "../packages/database/src/automation/finishAutomationRun.ts";
import { getAutomationForRun } from "../packages/database/src/automation/getAutomationForRun.ts";
import { getAutomationOwner } from "../packages/database/src/automation/getAutomationOwner.ts";
import { automationFileIsReady } from "../packages/database/src/automation/automationFileIsReady.ts";
const mocks = vi.hoisted(() => ({
  agent: vi.fn(),
  access: vi.fn(),
  claims: vi.fn(),
  client: vi.fn(),
  inspect: vi.fn(),
  content: vi.fn(),
}));
vi.mock("../packages/database/src/agent/getAgentById.ts", () => ({
  getAgentById: mocks.agent,
}));
vi.mock("../packages/database/src/storage/requireStorageAccess.ts", () => ({
  requireStorageAccess: mocks.access,
}));
vi.mock("../packages/database/src/user/buildAccessToken.ts", () => ({
  buildAccessToken: mocks.claims,
}));
vi.mock("../packages/database/src/auth/createClientWithClaims.ts", () => ({
  createClientWithClaims: mocks.client,
}));
vi.mock("../packages/database/src/storage/inspect.ts", () => ({
  inspect: mocks.inspect,
}));
vi.mock("../packages/database/src/storage/getDocumentContent.ts", () => ({
  getDocumentContent: mocks.content,
}));
const id = "aae00000-0000-4000-8000-000000000001";
const input = {
  name: "Report",
  agentId: "agent",
  message: "Summarize",
  enabled: true,
  trigger: {
    type: "time" as const,
    schedule: { kind: "hours" as const, every: 2 },
  },
};
const storageTrigger = {
  type: "storage" as const,
  storage: {
    type: "documentRepository" as const,
    workspaceId: "workspace",
    documentRepositoryId: "repository",
  },
  events: ["uploaded" as const],
  folder: "inbox",
  includeSubfolders: true,
  attachment: "copy" as const,
};
function fixture(response: any = { data: { id }, error: null }) {
  const q = query(response);
  q.lte = vi.fn(() => q);
  const supabase = {
    from: vi.fn(() => q),
    rpc: vi.fn().mockResolvedValue(response),
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { id, app_metadata: {} } },
          error: null,
        }),
      },
    },
  } as any;
  return {
    q,
    supabase,
    options: {
      userId: id,
      claims: [{ organization_id: "workspace", role: "editor" as const }],
      supabase,
      supabaseServiceRole: supabase,
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.agent.mockResolvedValue({ id: "agent", workspaceId: "workspace" });
  mocks.claims.mockResolvedValue([]);
  mocks.client.mockResolvedValue({ storage: { from: () => ({}) } });
  mocks.inspect.mockResolvedValue({ file: true });
});
afterEach(() => vi.useRealTimers());

it("authorizes the chosen agent before writes and preserves the MCP ceiling", async () => {
  const f = fixture();
  await saveAutomation(input, { ...f.options, level: "editor" });
  expect(f.q.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: id,
      access_level: "editor",
      agent_id: "agent",
      next_run_at: expect.any(String),
    }),
  );
  await expect(
    saveAutomation(input, { ...f.options, claims: [], level: "editor" }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  await expect(
    saveAutomation(input, { ...f.options, level: "user" }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  expect(f.q.insert).toHaveBeenCalledTimes(1);
  await saveAutomation({ ...input, id, enabled: false }, f.options);
  expect(f.q.eq).toHaveBeenCalledWith("user_id", id);
  expect(f.q.update).toHaveBeenCalledWith(
    expect.objectContaining({ next_run_at: null }),
  );
});
it("validates storage permissions and stores a segment-delimited scope", async () => {
  const f = fixture();
  await saveAutomation({ ...input, trigger: storageTrigger }, f.options);
  expect(mocks.access).toHaveBeenCalledWith(storageTrigger.storage, "read", {
    supabase: f.supabase,
  });
  expect(f.q.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      storage_bucket: "database_files",
      storage_prefix: "workspace/repository/",
    }),
  );
  mocks.access.mockRejectedValue(new Error("STORAGE_NOT_AUTHORIZED"));
  await expect(
    saveAutomation({ ...input, trigger: storageTrigger }, f.options),
  ).rejects.toThrow("STORAGE_NOT_AUTHORIZED");
});
it("rejects expired one-time schedules and sanitizes save/delete errors", async () => {
  const f = fixture({ error: { message: "private" } });
  await expect(saveAutomation(input, f.options)).rejects.toThrow(
    "AUTOMATION_SAVE_FAILED",
  );
  await expect(deleteAutomation(id, f.options)).rejects.toThrow(
    "AUTOMATION_DELETE_FAILED",
  );
  await expect(
    saveAutomation(
      {
        ...input,
        trigger: {
          type: "time",
          schedule: { kind: "once", at: "2000-01-01T00:00:00Z" },
        },
      },
      f.options,
    ),
  ).rejects.toThrow("AUTOMATION_DATE_PAST");
  const ok = fixture();
  expect(await deleteAutomation(id, ok.options)).toEqual({ id });
  expect(ok.q.eq).toHaveBeenCalledWith("user_id", id);
});
it("loads only personal definitions and bounded personal history", async () => {
  const row = {
    ...input,
    id,
    agent_id: "agent",
    next_run_at: null,
    created_at: "2030-01-01",
  };
  const f = fixture({ data: [row] });
  expect(await getAutomations(f.options)).toEqual([
    expect.objectContaining({ id, agentId: "agent", nextRunAt: null }),
  ]);
  expect(f.q.eq).toHaveBeenCalledWith("user_id", id);
  await getAutomationRuns(id, f.options);
  expect(f.q.limit).toHaveBeenCalledWith(50);
  const missing = fixture({ data: null });
  expect(await getAutomations(missing.options)).toEqual([]);
  await expect(getAutomationRuns(id, missing.options)).rejects.toThrow(
    "AUTOMATION_NOT_FOUND",
  );
  const failed = fixture({ error: {} });
  await expect(getAutomations(failed.options)).rejects.toThrow(
    "AUTOMATION_READ_FAILED",
  );
  f.supabase.from
    .mockReturnValueOnce(query({ data: { id } }))
    .mockReturnValueOnce(query({ error: {} }));
  await expect(getAutomationRuns(id, f.options)).rejects.toThrow(
    "AUTOMATION_READ_FAILED",
  );
});
it("coalesces due occurrences and uses the exact revision/deadline as a CAS", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-02T12:00:09Z"));
  const due = "2030-01-01T12:00:00Z";
  const f = fixture({
    data: [
      { id, revision: "revision", next_run_at: due, trigger: input.trigger },
      { id, trigger: storageTrigger },
      { id, trigger: input.trigger, next_run_at: null },
    ],
  });
  f.supabase.rpc.mockResolvedValue({ error: null });
  await dispatchAutomationTimes(f.options);
  expect(f.supabase.rpc).toHaveBeenCalledExactlyOnceWith(
    "enqueue_automation_time",
    {
      p_id: id,
      p_revision: "revision",
      p_due: due,
      p_next: "2030-01-02T14:00:00.000Z",
    },
  );
  f.supabase.rpc.mockResolvedValue({ error: {} });
  await expect(dispatchAutomationTimes(f.options)).rejects.toThrow(
    "AUTOMATION_DISPATCH_FAILED",
  );
  await expect(
    dispatchAutomationTimes(fixture({ error: {} }).options),
  ).rejects.toThrow("AUTOMATION_DISPATCH_FAILED");
  await dispatchAutomationTimes(fixture({ data: null }).options);
  const once = fixture({
    data: [
      {
        id,
        revision: "r",
        next_run_at: due,
        trigger: { type: "time", schedule: { kind: "once", at: due } },
      },
    ],
  });
  once.supabase.rpc.mockResolvedValue({});
  await dispatchAutomationTimes(once.options);
  expect(once.supabase.rpc).toHaveBeenCalledWith(
    "enqueue_automation_time",
    expect.objectContaining({ p_next: null }),
  );
});
it("wraps fenced begin/completion and never leaks database errors", async () => {
  const f = fixture({ data: [{ id }] });
  expect(await beginAutomationRun(id, "token", f.options)).toEqual({ id });
  expect(
    await beginAutomationRun(id, "token", fixture({ data: [] }).options),
  ).toBeNull();
  await finishAutomationRun(id, "queued", f.options);
  expect(f.q.eq).toHaveBeenCalledWith("state", "started");
  await finishAutomationRun(id, "failed", f.options);
  expect(f.q.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ error_code: "AUTOMATION_EXECUTION_FAILED" }),
  );
  const failure = fixture({ error: { message: "private" } });
  await expect(
    beginAutomationRun(id, "token", failure.options),
  ).rejects.toThrow("AUTOMATION_BEGIN_FAILED");
  await expect(
    finishAutomationRun(id, "failed", failure.options),
  ).rejects.toThrow("AUTOMATION_FINISH_FAILED");
  await expect(getAutomationForRun(id, failure.options)).rejects.toThrow(
    "AUTOMATION_READ_FAILED",
  );
  expect(
    await getAutomationForRun(id, fixture({ data: null }).options),
  ).toBeNull();
  expect(
    await getAutomationForRun(
      id,
      fixture({ data: { id, trigger: storageTrigger } }).options,
    ),
  ).toEqual({ id, trigger: storageTrigger });
});
it("refreshes permissions from trusted app metadata and rejects banned or absent owners", async () => {
  const f = fixture();
  expect(await getAutomationOwner(id, f.options)).toEqual([]);
  expect(mocks.claims).toHaveBeenCalledWith(
    { user_id: id, claims: { app_metadata: {} } },
    { supabaseServiceRole: f.supabase },
  );
  for (const response of [
    { data: { user: null } },
    { data: { user: { banned_until: "2999-01-01" } } },
    { data: { user: { id } }, error: {} },
  ]) {
    f.supabase.auth.admin.getUserById.mockResolvedValue(response);
    await expect(getAutomationOwner(id, f.options)).rejects.toThrow(
      "NOT_AUTHORIZED",
    );
  }
});
it("waits for uploaded file content but not for deleted, missing or unselected attachments", async () => {
  const f = fixture();
  const pending = {
    automation_id: id,
    state: "pending",
    event: { type: "uploaded", path: "inbox/file.pdf" },
  };
  const prepare = (run: any = pending, trigger: any = storageTrigger) => {
    f.supabase.from
      .mockReturnValueOnce(query({ data: run }))
      .mockReturnValueOnce(query({ data: { user_id: id, trigger } }));
  };
  prepare();
  expect(await automationFileIsReady(id, f.options)).toBe(false);
  mocks.content.mockResolvedValue("Extracted");
  prepare();
  expect(await automationFileIsReady(id, f.options)).toBe(true);
  mocks.inspect.mockResolvedValue(undefined);
  prepare();
  expect(await automationFileIsReady(id, f.options)).toBe(true);
  prepare({ ...pending, event: { type: "deleted", path: "file.pdf" } });
  expect(await automationFileIsReady(id, f.options)).toBe(true);
  prepare(pending, { ...storageTrigger, attachment: "none" });
  expect(await automationFileIsReady(id, f.options)).toBe(true);
});

it("runs only owned saved definitions and atomically queues an idempotent manual request", async () => {
  const { runAutomationNow } =
    await import("../packages/database/src/automation/runAutomationNow.ts");
  const f = fixture({
    data: {
      id,
      agent_id: "agent",
      revision: "revision",
      access_level: "admin",
      trigger: input.trigger,
    },
  });
  f.supabase.rpc.mockResolvedValue({ data: id });
  expect(
    await runAutomationNow(
      { id, requestId: id },
      { ...f.options, level: "editor" },
    ),
  ).toEqual({ id });
  expect(f.q.eq).toHaveBeenCalledWith("user_id", id);
  expect(f.supabase.rpc).toHaveBeenCalledWith(
    "enqueue_automation_manual",
    expect.objectContaining({
      p_user_id: id,
      p_request_id: id,
      p_revision: "revision",
      p_event: { type: "manual", path: "", accessLevel: "editor" },
    }),
  );
  await expect(
    runAutomationNow({ id, requestId: id }, { ...f.options, level: "user" }),
  ).rejects.toThrow("NOT_AUTHORIZED");
  await expect(
    runAutomationNow({ id, requestId: id }, fixture({ data: null }).options),
  ).rejects.toThrow("AUTOMATION_NOT_FOUND");
  f.supabase.rpc.mockResolvedValue({ error: {} });
  await expect(
    runAutomationNow({ id, requestId: id }, f.options),
  ).rejects.toThrow("AUTOMATION_RUN_FAILED");
});
it("requires existing in-scope test files and honors non-recursive folder limits", async () => {
  const { runAutomationNow } =
    await import("../packages/database/src/automation/runAutomationNow.ts");
  const f = fixture({
    data: {
      id,
      agent_id: "agent",
      revision: "revision",
      access_level: "editor",
      trigger: { ...storageTrigger, includeSubfolders: false },
    },
  });
  f.supabase.storage = { from: () => ({}) };
  f.supabase.rpc.mockResolvedValue({ data: id });
  for (const path of [
    undefined,
    "inbox-other/file.pdf",
    "inbox/sub/file.pdf",
    "../file.pdf",
  ])
    await expect(
      runAutomationNow({ id, requestId: id, path }, f.options),
    ).rejects.toThrow();
  await runAutomationNow(
    { id, requestId: id, path: "inbox/file.pdf" },
    f.options,
  );
  expect(f.supabase.rpc).toHaveBeenCalledWith(
    "enqueue_automation_manual",
    expect.objectContaining({
      p_event: {
        type: "manual",
        path: "inbox/file.pdf",
        accessLevel: "editor",
      },
    }),
  );
  mocks.inspect.mockResolvedValue(undefined);
  await expect(
    runAutomationNow({ id, requestId: id, path: "inbox/file.pdf" }, f.options),
  ).rejects.toThrow("AUTOMATION_FILE_REQUIRED");
});

it("persists card metadata independently and creates copies without changing the original", async () => {
  const f = fixture({ data: { id } });
  const appearance = {
    description: "Team overview",
    icon: { type: "icon-lucide" as const, iconName: "calendar-clock" },
    color: { type: "color-oklch-hue" as const, oklchHue: 290 },
  };
  await saveAutomation({ ...input, ...appearance, id }, f.options);
  expect(f.q.update).toHaveBeenCalledWith(
    expect.objectContaining({ ...appearance, message: input.message }),
  );
  expect(f.q.eq).toHaveBeenCalledWith("user_id", id);
  f.q.update.mockClear();
  await saveAutomation({ ...input, ...appearance, enabled: false }, f.options);
  expect(f.q.update).not.toHaveBeenCalled();
  expect(f.q.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      ...appearance,
      enabled: false,
      next_run_at: null,
    }),
  );
});
it("loads favorite automation appearances through the authenticated RLS client", async () => {
  const { getAutomationsByIds } =
    await import("../packages/database/src/automation/getAutomationsByIds.ts");
  const f = fixture({
    data: [
      {
        id,
        name: "Report",
        description: "Team summary",
        color: { type: "color-oklch-hue", oklchHue: 290 },
        icon: { type: "icon-lucide", iconName: "timer" },
        agent_id: "agent",
        message: "Start",
        enabled: false,
        trigger: input.trigger,
        next_run_at: null,
        created_at: "2030-01-01",
      },
    ],
  });
  expect(await getAutomationsByIds([id, "invalid"], f.options)).toEqual([
    expect.objectContaining({
      id,
      description: "Team summary",
      icon: { type: "icon-lucide", iconName: "timer" },
    }),
  ]);
  expect(f.q.in).toHaveBeenCalledWith("id", [id]);
  f.supabase.from.mockClear();
  expect(await getAutomationsByIds(["not-an-id"], f.options)).toEqual([]);
  expect(f.supabase.from).not.toHaveBeenCalled();
  await expect(
    getAutomationsByIds(
      [id],
      fixture({ error: { message: "private" } }).options,
    ),
  ).rejects.toThrow("AUTOMATION_READ_FAILED");
  expect(
    await getAutomationsByIds([id], fixture({ data: null }).options),
  ).toEqual([]);
});
