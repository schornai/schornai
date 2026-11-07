// @vitest-environment jsdom
import "./client-setup";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const views = vi.hoisted(() => ({
  agent: vi.fn(),
  repository: vi.fn(),
  file: vi.fn(),
  draft: vi.fn(),
  tile: vi.fn(),
}));
vi.mock("../../apps/web/app/(main)/agent/_components/AgentInfo", () => ({
  AgentInfo: (p: any) => {
    views.agent(p);
    return <div>Agent info: {p.agent.name}</div>;
  },
}));
vi.mock(
  "../../apps/web/app/(main)/app/documents/[documentRepositoryId]/_components/DocumentRepositoryInfo",
  () => ({
    DocumentRepositoryInfo: (p: any) => {
      views.repository(p);
      return <div>Repository info: {p.documentRepository.name}</div>;
    },
  }),
);
vi.mock("../../apps/web/app/_components/StorageFilePreview", () => ({
  StorageFilePreview: (p: any) => {
    views.file(p);
    return <div>Stored file preview</div>;
  },
}));
vi.mock("../../apps/web/app/_components/StorageFilePreviewMDC", () => ({
  StorageFilePreviewMDC: (p: any) => {
    views.draft(p);
    return <div>Draft preview</div>;
  },
}));
vi.mock("../../apps/web/app/_components/StorageObjectTile", () => ({
  StorageObjectTile: (p: any) => {
    views.tile(p);
    return <div>{p.storageObject.name}</div>;
  },
}));
import { PlatformToolPreview } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/PlatformToolPreview";
import {
  ChatMessagePartToolPlatform,
  isPlatformToolPart,
} from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatMessagePartToolPlatform";
import {
  platformPreviewAgent as agent,
  platformPreviewRepository as repository,
  platformPreviewFile as file,
} from "../../apps/web/.storybook/platform-tool-fixtures";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const show = (value: unknown, toolName = "platform_test", rest: any = {}) =>
  render(<PlatformToolPreview toolName={toolName} value={value} {...rest} />);
describe("platform result snapshots", () => {
  it("renders labeled values, booleans, lists, rich text and empty fields without JSON or secrets", () => {
    const { container } = show({
      name: "Name",
      enabled: true,
      disabled: false,
      none: null,
      unknown: undefined,
      count: 4,
      content: "Content",
      current: "Current",
      text: "Text",
      documentation: "Docs",
      items: ["one", { name: "nested" }],
      empty: [],
      object: {},
      password: "hidden-password",
      apiKey: "hidden-key",
      headers: { Authorization: "hidden-header" },
    });
    expect(container.textContent).toContain("Name");
    expect(screen.getByText("labelYes")).toBeTruthy();
    expect(screen.getByText("labelNo")).toBeTruthy();
    expect(screen.getAllByText("labelEmpty")).toHaveLength(2);
    expect(container.textContent).not.toContain("hidden-");
    expect(screen.getAllByText("labelConfidential")).toHaveLength(3);
    expect(screen.getByText("labelNoEntries")).toBeTruthy();
    expect(screen.getByText("labelNoDetails")).toBeTruthy();
    expect(screen.getByText("nested")).toBeTruthy();
  });
  it("bounds deeply nested values", () => {
    let value: any = "end";
    for (let i = 0; i < 12; i++) value = { nested: value };
    show(value);
    expect(screen.getByText("labelNested")).toBeTruthy();
  });
  it.each([() => {}, Symbol("opaque")])(
    "ignores unsupported non-JSON values",
    (value) => {
      const { container } = show(value);
      expect(container.textContent).toBe("");
    },
  );
  it.each([
    ["platform_agent_get", agent, "agent"],
    ["platform_repository_get", repository, "repository"],
  ] as const)(
    "uses the native read-only info component for %s",
    (toolName, value, kind) => {
      show(value, toolName);
      expect(views[kind]).toHaveBeenCalledWith(
        expect.objectContaining({ preview: true }),
      );
      expect(screen.getByText(/demo-workspace/)).toBeTruthy();
    },
  );
  it.each([
    [
      "platform_agent_get",
      { version: "agent-config-version-4", name: "Incomplete" },
    ],
    ["platform_repository_get", { type: "database-v2", name: "Incomplete" }],
  ])(
    "falls back to readable fields for incomplete snapshots",
    (toolName, value) => {
      show(value, toolName as string);
      expect(screen.getByText("Incomplete")).toBeTruthy();
    },
  );
  it.each([{}, { input: { repositoryId: "repo" } }])(
    "uses native file tiles with optional storage references",
    (rest) => {
      show(
        [file, { name: "folder", path: "folder", folder: true }],
        "platform_files_list",
        { result: true, ...rest },
      );
      expect(screen.getByText(file.name)).toBeTruthy();
      expect(views.tile).toHaveBeenCalledTimes(2);
    },
  );
  it.each([[], [null], [{}], [{ name: "bad", path: "bad", file: true }]])(
    "handles empty and invalid legacy file results",
    (value) => {
      show(value, "platform_files_list", { result: true });
      expect(views.tile).not.toHaveBeenCalled();
    },
  );
  it("does not render arbitrary tool arrays as storage tiles", () => {
    show([file], "platform_test", { result: true });
    expect(views.tile).not.toHaveBeenCalled();
  });
  it.each(["platform_file_write", "platform_activity_file_write"])(
    "previews %s drafts without file actions",
    (toolName) => {
      show(
        {
          storage: {
            type: "activity",
            agentId: "agent",
            activityId: "activity",
          },
          path: "file.md",
          text: "Draft",
        },
        toolName,
      );
      expect(views.draft).toHaveBeenCalledWith(
        expect.objectContaining({
          fileContent: { type: "mdc", current: "Draft", versions: [] },
        }),
      );
      expect(views.file).not.toHaveBeenCalled();
      expect(screen.queryByText("labelOpenFile")).toBeNull();
      expect(screen.getByText(/activity/)).toBeTruthy();
    },
  );
  it("shows the repository target for a draft", () => {
    show(
      { repositoryId: "repo", path: "draft.md", text: "Draft" },
      "platform_file_write",
    );
    expect(screen.getByText(/repo/)).toBeTruthy();
  });
  it("reuses original metadata and warns when saved content could not be indexed", () => {
    show({ file, status: "saved", indexQueued: false }, "platform_file_write", {
      result: true,
      input: { repositoryId: "repo", path: file.path, text: "Saved" },
    });
    expect(views.file).toHaveBeenCalledWith(
      expect.objectContaining({ fileObject: file, canWrite: false }),
    );
    expect(
      screen
        .getByRole("button", { name: "labelOpenFile" })
        .getAttribute("href"),
    ).toContain(file.path);
    expect(screen.getByText("descriptionIndexNotQueued")).toBeTruthy();
  });
  it("creates a read-only text snapshot when original file metadata is absent", () => {
    show({ type: "mdc", current: "Read" }, "platform_file_read", {
      result: true,
      input: { repositoryId: "repo", path: "read.md" },
    });
    expect(views.file).toHaveBeenCalledWith(
      expect.objectContaining({
        fileContent: { type: "mdc", current: "Read", versions: [] },
        fileObject: expect.objectContaining({ name: "read.md", size: 4 }),
      }),
    );
  });
  it("renders transcript snapshots with native transcript controls", () => {
    show({ type: "transcript", segments: [] }, "platform_file_read", {
      result: true,
      input: {
        storage: {
          type: "activity-transcription",
          transcriberId: "transcriber",
          activityId: "activity",
        },
        path: "audio.mp3",
      },
    });
    expect(views.file).toHaveBeenCalledWith(
      expect.objectContaining({
        fileContent: { type: "transcript", segments: [] },
      }),
    );
  });
  it("uses safe fallback previews when the storage reference is absent", () => {
    show({ type: "mdc", current: "Read" }, "platform_file_read", {
      result: true,
      input: { path: "read.md" },
    });
    expect(views.draft).toHaveBeenCalled();
    expect(views.file).not.toHaveBeenCalled();
    cleanup();
    show({ type: "transcript", segments: [] }, "platform_file_read", {
      result: true,
      input: { path: "audio.mp3" },
    });
    expect(views.file).not.toHaveBeenCalled();
  });
  it.each(["conflict", "recoveryRequired"])(
    "does not show uncommitted content as saved on %s",
    (status) => {
      show({ status }, "platform_file_write", {
        result: true,
        input: { path: "file.md", text: "unsaved" },
      });
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(views.file).not.toHaveBeenCalled();
    },
  );
  it.each([
    { type: "transcript", segments: "invalid" },
    { status: "content_unavailable" },
  ])("falls back for unavailable or malformed extracted content", (value) => {
    show(value, "platform_file_read", {
      result: true,
      input: { repositoryId: "repo", path: "read.md" },
    });
    expect(views.file).not.toHaveBeenCalled();
  });
});
describe("platform chat steps", () => {
  it.each([
    { state: "input-streaming", expected: "labelPending" },
    { state: "output-error", expected: "labelError" },
    { state: "output-denied", expected: "labelDenied" },
    { state: "approval-requested", expected: "labelApproval" },
    {
      state: "approval-responded",
      approval: { approved: false },
      expected: "labelDenied",
    },
    {
      state: "approval-responded",
      approval: { approved: true },
      expected: "labelPending",
    },
    {
      state: "output-available",
      output: { status: "conflict" },
      expected: "labelError",
    },
    {
      state: "output-available",
      output: { status: "recoveryRequired" },
      expected: "labelError",
    },
    {
      state: "output-available",
      output: { saved: true },
      expected: "labelDone",
    },
    { state: "output-available", output: "ok", expected: "labelDone" },
  ])(
    "displays $state as $expected and closes its preview",
    ({ expected, ...part }) => {
      render(
        <ChatMessagePartToolPlatform
          part={
            {
              type: "tool-platform_test",
              toolCallId: "call",
              input: { name: "input" },
              ...part,
            } as any
          }
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("status").textContent).toBe(expected);
      fireEvent.click(screen.getByRole("button", { name: "labelClose" }));
      expect(screen.queryByRole("status")).toBeNull();
    },
  );
  it.each([
    ["agent", agent, "agentId"],
    ["repository", repository, "documentRepositoryId"],
  ] as const)(
    "combines created %s ID with its submitted configuration exactly once",
    (kind, entity, idKey) => {
      render(
        <ChatMessagePartToolPlatform
          part={
            {
              type: `tool-platform_${kind}_create`,
              toolCallId: "call",
              state: "output-available",
              input: { [kind]: entity },
              output: { [idKey]: "new-id" },
            } as any
          }
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(views[kind]).toHaveBeenCalledTimes(1);
      expect(
        views[kind].mock.calls[0][0][
          kind === "agent" ? "agent" : "documentRepository"
        ],
      ).toMatchObject({ id: "new-id" });
      expect(screen.queryByText("labelRequest")).toBeNull();
    },
  );
  it.each([
    "platform_file_read",
    "platform_file_write",
    "platform_activity_file_write",
  ])("shows a single result preview for %s", (name) => {
    render(
      <ChatMessagePartToolPlatform
        part={
          {
            type: `tool-${name}`,
            toolCallId: "call",
            state: "output-available",
            input: { path: "file.md", text: "Saved" },
            output: { type: "mdc", current: "Read" },
          } as any
        }
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("labelRequest")).toBeNull();
  });
  it("recognizes only platform parts", () => {
    expect(isPlatformToolPart({ type: "tool-platform_test" } as any)).toBe(
      true,
    );
    expect(isPlatformToolPart({ type: "tool-mcp" } as any)).toBe(false);
  });
});
