import { expect, it, vi } from "vitest";
import { storageToAgentPath } from "../packages/database/src/storage/_utils/storageToAgentPath";
import {
  storageTransferFileToolApproval,
  storageTransferFileTool,
} from "../apps/realtime/src/chat/tools/documentRepository/storageTransferFile";
const transfer = vi.hoisted(() => vi.fn());
vi.mock(
  "@schornio/aibox-realtime/documents/storage/transferStorageFile",
  () => ({ transferStorageFile: transfer }),
);
const repository = {
  id: "repo",
  workspaceId: "workspace",
  identifier: "documents",
} as any;
const storage = {
  type: "documentRepository",
  workspaceId: "workspace",
  documentRepositoryId: "repo",
} as const;
const mount = {
  id: crypto.randomUUID(),
  mount: "docs",
  pathRepository: "reports",
  documentRepositoryIdentifier: "documents",
  permission: "read-only" as const,
};
const context = {
  agentId: "agent",
  activityId: "activity",
  repositories: [repository],
  storage,
  path: "reports/2026/a.txt",
  roles: [{ documentRepositoryMounts: [mount] }],
};
it("reuses a mounted subdirectory path and respects directory boundaries", () => {
  expect(storageToAgentPath(context)).toBe("docs/2026/a.txt");
  expect(
    storageToAgentPath({ ...context, path: "reports-private/a.txt" }),
  ).toBeUndefined();
  expect(
    storageToAgentPath({
      ...context,
      storage: { ...storage, workspaceId: "other" },
    }),
  ).toBeUndefined();
});
it("requires a valid common path across role selection and falls back for shadowed mounts", () => {
  expect(
    storageToAgentPath({
      ...context,
      roles: [...context.roles, { documentRepositoryMounts: [] }],
    }),
  ).toBeUndefined();
  const hidden = { ...mount, mount: "docs/2026", pathRepository: "private" };
  expect(
    storageToAgentPath({
      ...context,
      roles: [{ documentRepositoryMounts: [mount, hidden] }],
    }),
  ).toBeUndefined();
  expect(
    storageToAgentPath({
      ...context,
      roles: [context.roles[0]!, context.roles[0]!],
    }),
  ).toBe("docs/2026/a.txt");
});
it("does not expose ambiguous repository identifiers or the reserved conversation mount", () => {
  expect(
    storageToAgentPath({
      ...context,
      repositories: [repository, { ...repository, id: "other" }],
    }),
  ).toBeUndefined();
  expect(
    storageToAgentPath({
      ...context,
      roles: [
        {
          documentRepositoryMounts: [{ ...mount, mount: "this_conversation" }],
        },
      ],
    }),
  ).toBeUndefined();
});
const toolContext = {
  activityId: "activity",
  agentId: "agent",
  mounts: [
    mount,
    {
      ...mount,
      mount: "target",
      pathRepository: "target",
      permission: "confirm-write" as const,
    },
  ],
  mountedDocumentRepositories: [repository],
};
it("applies source and target mount permissions separately for copy and move", () => {
  expect(
    storageTransferFileToolApproval(
      false,
      toolContext,
    )({ fromPath: "docs/a.txt", toPath: "this_conversation/a.txt" }),
  ).toBe("approved");
  expect(
    storageTransferFileToolApproval(
      true,
      toolContext,
    )({ fromPath: "docs/a.txt", toPath: "this_conversation/a.txt" }),
  ).toBe("denied");
  expect(
    storageTransferFileToolApproval(
      false,
      toolContext,
    )({ fromPath: "docs/a.txt", toPath: "target/a.txt" }),
  ).toBe("user-approval");
  expect(
    storageTransferFileToolApproval(
      false,
      toolContext,
    )({ fromPath: "this_conversation/a.txt", toPath: "docs/a.txt" }),
  ).toBe("denied");
  expect(
    storageTransferFileToolApproval(
      false,
      toolContext,
    )({ fromPath: "docs/../private/a.txt", toPath: "target/a.txt" }),
  ).toBe("denied");
});
it("prevents direct execution of a forbidden move and reports successful transfer with a processing error without retrying", async () => {
  const options = {
    supabase: {} as any,
    websocketProvider: {} as any,
    serverToken: "Worker test" as const,
  };
  const forbidden = storageTransferFileTool(true, toolContext, options);
  expect(
    await forbidden.execute!(
      { fromPath: "docs/a.txt", toPath: "target/a.txt" },
      { toolCallId: "call", messages: [] },
    ),
  ).toMatchObject({ ok: false });
  expect(transfer).not.toHaveBeenCalled();
  transfer.mockResolvedValueOnce({
    file: { path: "a.txt" },
    storage,
    processing: "error",
  });
  const copy = storageTransferFileTool(false, toolContext, options);
  expect(
    await copy.execute!(
      { fromPath: "docs/a.txt", toPath: "this_conversation/a.txt" },
      { toolCallId: "call", messages: [] },
    ),
  ).toMatchObject({ ok: true, processing: "error", storagePath: "a.txt" });
  expect(transfer).toHaveBeenCalledOnce();
  expect(transfer.mock.calls[0]![0]).toMatchObject({
    from: { path: "reports/a.txt" },
    to: { folder: "", name: "a.txt" },
    move: false,
  });
});
