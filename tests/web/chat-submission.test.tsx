// @vitest-environment jsdom
import "./client-setup";
import { client } from "./client-setup";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Collapsible } from "../../packages/ui/src/components/collapsible";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatComposeMessageSelected } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageSelected";
import { ChatToolApproval } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatToolApproval";
import { ChatComposeMessage } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessage";
const mocks = vi.hoisted(() => ({
  context: {} as any,
  canSend: true,
  chatStatus: "idle",
  uploads: [] as any[],
  pendingFilePaths: [] as string[],
  unconfirmedFilePaths: [] as string[],
  upload: vi.fn(),
  state: vi.fn(),
  batchState: vi.fn(),
  first: vi.fn(),
  text: vi.fn(),
  thinking: vi.fn(),
  sync: vi.fn(),
  approve: vi.fn(),
  attach: vi.fn(),
  selectFile: vi.fn(),
  files: [] as any[],
  tile: vi.fn(),
}));
vi.mock(
  "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageContext",
  () => ({ useChatComposeMessage: () => mocks.context }),
);
vi.mock(
  "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatContext",
  () => ({
    useCanSendMessage: () => mocks.canSend,
    useMessages: () => [],
    useChatStatus: () => mocks.chatStatus,
  }),
);
vi.mock(
  "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatVoiceRecorder",
  () => ({
    ChatVoiceRecorder: ({
      onClose,
      autoStart,
      thinking,
    }: {
      onClose: () => void;
      autoStart: boolean;
      thinking: boolean;
    }) => (
      <button onClick={onClose} data-start={autoStart} data-thinking={thinking}>
        Close recorder
      </button>
    ),
  }),
);
vi.mock("../../apps/web/app/_components/FileUploadProvider", () => ({
  useFileUpload: () => ({
    uploads: mocks.uploads,
    queueFileUploadsByFileList: mocks.upload,
  }),
}));
vi.mock("../../apps/web/app/_components/StorageViewProvider", () => ({
  useStorageView: () => ({
    itemGroups: [["files", mocks.files]],
    pendingFilePaths: mocks.pendingFilePaths,
    unconfirmedFilePaths: mocks.unconfirmedFilePaths,
    storage: { type: "activity", agentId: "agent", activityId: "activity" },
    basePathApp: "/files",
  }),
}));
vi.mock("../../apps/web/app/_components/StorageObjectTile", () => ({
  StorageObjectTile: (props: any) => {
    mocks.tile(props);
    return (
      <a href={`${props.basePathApp}/${props.storageObject.path}`}>
        {props.storageObject.name}
      </a>
    );
  },
}));
vi.mock(
  "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_actions/submitCurrentMessage",
  () => ({ submitCurrentMessage: vi.fn() }),
);
vi.mock("../../apps/web/app/_actions/storageBrowse", () => ({
  storageBrowse: async (input: any) => ({
    data: {
      repositories: [{ id: "repo", workspaceId: "workspace", name: "Repo" }],
      files: input.storage
        ? [
            {
              file: true,
              name: "existing.txt",
              path: "existing.txt",
              size: 1,
              type: "text/plain",
              createdAtISO: "2026-01-15",
              updatedAtISO: "2026-01-15",
            },
          ]
        : [],
    },
  }),
}));
vi.mock("../../apps/web/app/_actions/storageSelectChatFile", () => ({
  storageSelectChatFile: mocks.selectFile,
}));
afterEach(cleanup);
beforeEach(() => {
  client.execute.mockReset().mockResolvedValue({});
  client.pending = false;
  mocks.canSend = true;
  mocks.chatStatus = "idle";
  mocks.uploads = [];
  mocks.unconfirmedFilePaths = [];
  mocks.pendingFilePaths = [];
  mocks.files = [];
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockReset();
  mocks.sync.mockResolvedValue(undefined);
  mocks.first.mockReturnValue("message");
  mocks.context = {
    activityId: "activity",
    agentId: "agent",
    addSelectedFiles: mocks.attach,
    messageBatch: [
      {
        id: "message",
        state: "paused",
        content: { type: "text", text: "Draft" },
      },
    ],
    selectedCurrentMessage: {
      id: "message",
      state: "paused",
      content: { type: "text", text: "Draft" },
    },
    defaultThinking: false,
    setMessageState: mocks.state,
    setMessageBatchState: mocks.batchState,
    setFirstCurrentMessageSubmitted: mocks.first,
    setSelectedCurrentMessageText: mocks.text,
    setSelectedCurrentMessageThinking: mocks.thinking,
    waitForSubmittedChanges: mocks.sync,
    submitToolApproval: mocks.approve,
    approvalSubmitted: false,
  };
});
function compose() {
  return render(
    <Collapsible>
      <ChatComposeMessageSelected />
    </Collapsible>,
  );
}

it("stops an active generation through the server action and reports failures", async () => {
  mocks.context.activity = { state: "running" };
  mocks.chatStatus = "generating";
  mocks.context.interaction = { type: "message-batch" };
  const view = render(<ChatComposeMessage />);
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  await waitFor(() =>
    expect(client.execute).toHaveBeenCalledWith({
      activityId: "activity",
      agentId: "agent",
    }),
  );
  client.execute.mockResolvedValueOnce({ serverError: "failed" });
  fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe("errorCancel"),
  );
  mocks.chatStatus = "idle";
  // The independently replicated activity still says running.
  view.rerender(<ChatComposeMessage />);
  expect(screen.queryByRole("button", { name: "labelCancel" })).toBeNull();
});
const request = { approvalId: "approval", toolName: "custom", input: {} };
describe("chat submission UI", () => {
  it("edits the draft and synchronizes before requesting generation", async () => {
    compose();
    const text = screen.getByRole("textbox");
    expect(document.activeElement).toBe(text);
    fireEvent.change(text, { target: { value: "Updated" } });
    expect(mocks.text).toHaveBeenCalledWith("Updated");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "buttonSend" })),
    );
    expect(mocks.first).toHaveBeenCalledOnce();
    expect(client.execute).toHaveBeenCalledWith({
      agentId: "agent",
      activityId: "activity",
    });
  });
  it.each(["sync", "server", "validation"])(
    "restores draft states when %s submission fails",
    async (failure) => {
      if (failure === "sync")
        mocks.sync.mockRejectedValue(new Error("not synced"));
      if (failure === "server")
        client.execute.mockResolvedValue({ serverError: "denied" });
      if (failure === "validation")
        client.execute.mockResolvedValue({ validationErrors: {} });
      const view = compose();
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: "buttonSend" })),
      );
      expect(mocks.state).toHaveBeenCalledWith("message", "paused");
      expect(view.container.querySelector("form")!.className).toContain(
        "ring-destructive",
      );
    },
  );
  it("queues a paused batch and restores newly created submitted messages on failure", async () => {
    mocks.context.messageBatch.push({
      id: "second",
      state: "paused",
      content: { type: "text" },
    });
    mocks.first.mockReturnValue("new");
    mocks.sync.mockRejectedValue(new Error("failed"));
    compose();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "buttonStartBatch" })),
    );
    expect(mocks.batchState).toHaveBeenCalledWith("queued");
    expect(mocks.state).toHaveBeenCalledWith("new", "paused");
    expect(mocks.state).toHaveBeenCalledWith("second", "paused");
  });
  it("prevents duplicate submissions while synchronization is pending", async () => {
    let resolve!: () => void;
    mocks.sync.mockReturnValue(new Promise<void>((r) => (resolve = r)));
    const view = compose();
    const form = view.container.querySelector("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mocks.first).toHaveBeenCalledOnce();
    await act(async () => resolve());
  });
  it("allows pausing a queued batch during generation", () => {
    mocks.context.activity = { state: "running" };
    mocks.context.messageBatch.push({
      id: "second",
      state: "queued",
      content: { type: "text" },
    });
    const view = compose();
    fireEvent.click(screen.getByRole("button", { name: "buttonPause" }));
    expect(mocks.batchState).toHaveBeenCalledWith("paused");
    fireEvent.submit(view.container.querySelector("form")!);
    expect(mocks.first).not.toHaveBeenCalled();
  });
  it("keeps submitted drafts read-only and accepts selected upload files", () => {
    mocks.context.selectedCurrentMessage.state = "submitted";
    const view = compose();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(
      true,
    );
    const files = [new File(["text"], "file.txt")];
    fireEvent.change(view.container.querySelector("input[type=file]")!, {
      target: { files },
    });
    expect(mocks.upload).toHaveBeenCalledWith(files);
  });
  it.each([true, false])(
    "submits tool approval %s after synchronization",
    async (approved) => {
      render(<ChatToolApproval request={request} />);
      await act(async () =>
        fireEvent.click(
          screen.getByRole("button", {
            name: approved ? "labelApprove" : "labelReject",
          }),
        ),
      );
      expect(mocks.approve).toHaveBeenCalledWith({
        approvalId: "approval",
        approved,
      });
      expect(client.execute).toHaveBeenCalledWith({
        agentId: "agent",
        activityId: "activity",
      });
    },
  );
  it("shows pending approval and disables actions while disconnected", () => {
    mocks.context.approvalSubmitted = true;
    const view = render(<ChatToolApproval request={request} />);
    expect(screen.getByRole("status").textContent).toBe("labelSubmitting");
    mocks.context.approvalSubmitted = false;
    mocks.canSend = false;
    view.rerender(<ChatToolApproval request={request} />);
    expect(
      (
        screen.getByRole("button", {
          name: "labelApprove",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("exposes synchronization failure and retries an already submitted approval", async () => {
    mocks.sync.mockRejectedValueOnce(new Error("not synced"));
    const view = render(<ChatToolApproval request={request} />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "labelApprove" })),
    );
    expect(screen.getByRole("alert").textContent).toBe("errorSubmit");
    mocks.context.approvalSubmitted = true;
    view.rerender(<ChatToolApproval request={request} />);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "labelRetry" })),
    );
    expect(client.execute).toHaveBeenCalledOnce();
  });
});

import { ChatComposeMessageBatch } from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageBatch";
it("opens the complete composer and switches between input and tool approval", () => {
  mocks.context.interaction = { type: "message-batch" };
  const view = render(<ChatComposeMessage />);
  expect(screen.getByRole("textbox")).toBeTruthy();
  mocks.context.interaction = { type: "tool-approval", request };
  view.rerender(<ChatComposeMessage />);
  expect(screen.getByRole("button", { name: "labelApprove" })).toBeTruthy();
});
it.each(["paused", "queued"])(
  "selects, removes, adds and toggles a %s batch message",
  (state) => {
    const selected = vi.fn(),
      remove = vi.fn(),
      add = vi.fn(() => ({ messageId: "new" }));
    Object.assign(mocks.context, {
      activity: { state: "running" },
      setSelectedCurrentMessageId: selected,
      messageBatchDelete: remove,
      messageBatchAdd: add,
    });
    mocks.context.messageBatch[0].state = state;
    const view = render(<ChatComposeMessageBatch />);
    fireEvent.click(screen.getByRole("button", { name: "Draft" }));
    expect(selected).toHaveBeenCalledWith("message");
    fireEvent.click(view.container.querySelector("button:has(svg.lucide-x)")!);
    expect(remove).toHaveBeenCalledWith("message");
    fireEvent.click(
      view.container.querySelector(
        state === "queued"
          ? "button:has(svg.lucide-list-video)"
          : "button:has(svg.lucide-pause)",
      )!,
    );
    expect(mocks.state).toHaveBeenCalledWith(
      "message",
      state === "queued" ? "paused" : "queued",
    );
    fireEvent.click(screen.getByRole("button", { name: "labelNewMessage" }));
    expect(add).toHaveBeenCalledOnce();
    expect(selected).toHaveBeenCalledWith("new");
  },
);

it("submits on Enter, preserves Shift+Enter and toggles explicit thinking", async () => {
  const view = compose();
  const textarea = screen.getByRole("textbox");
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
  expect(mocks.first).not.toHaveBeenCalled();
  await act(async () => fireEvent.keyDown(textarea, { key: "Enter" }));
  expect(mocks.first).toHaveBeenCalledOnce();
  fireEvent.click(
    view.container.querySelector("button:has(svg.lucide-brain)")!,
  );
  expect(mocks.thinking).toHaveBeenCalledWith(true);
});
it("handles an absent selected draft and displays explicit thinking without attachments", () => {
  mocks.context.selectedCurrentMessage = undefined;
  const view = compose();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  mocks.context.selectedCurrentMessage = {
    id: "message",
    content: {
      text: "Think",
      thinking: true,
      files: [{ name: "file.txt", url: "file.txt" }],
    },
  };
  view.rerender(
    <Collapsible>
      <ChatComposeMessageSelected />
    </Collapsible>,
  );
  fireEvent.click(
    view.container.querySelector("button:has(svg.lucide-brain)")!,
  );
  expect(mocks.thinking).toHaveBeenCalledWith(false);
});

describe("web tool approvals", () => {
  it.each([
    [
      "web-fetch",
      { url: "https://example.com" },
      "descriptionFetch",
      "https://example.com",
    ],
    [
      "web-search",
      { query: "Research query" },
      "descriptionSearch",
      "Research query",
    ],
  ])(
    "shows the exact input and resumes after approving %s",
    async (toolName, input, description, value) => {
      render(
        <ChatToolApproval request={{ ...request, toolName, input } as any} />,
      );
      expect(screen.getByText(description as string)).toBeTruthy();
      expect(screen.getByText(value as string)).toBeTruthy();
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name: "labelApprove" })),
      );
      expect(mocks.approve).toHaveBeenCalledWith({
        approvalId: "approval",
        approved: true,
      });
      expect(client.execute).toHaveBeenCalledWith({
        agentId: "agent",
        activityId: "activity",
      });
    },
  );
});

it.each(["queued", "uploading", "registering"])(
  "blocks send, Enter and batch submission while a file is %s",
  (state) => {
    mocks.context.messageBatch.push({
      id: "other",
      state: "paused",
      content: {
        type: "text",
        text: "Another draft",
        files: [{ path: "/nested/file.pdf" }],
      },
    });
    if (state === "registering")
      mocks.unconfirmedFilePaths = ["/nested/file.pdf"];
    else mocks.uploads = [{ state }];
    const view = compose();
    expect(
      screen
        .getByRole("button", { name: "buttonSend" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "buttonStartBatch" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    fireEvent.submit(view.container.querySelector("form")!);
    expect(mocks.first).not.toHaveBeenCalled();
    expect(mocks.batchState).not.toHaveBeenCalled();
    expect(client.execute).not.toHaveBeenCalled();

    mocks.uploads = [];
    mocks.unconfirmedFilePaths = [];
    view.rerender(
      <Collapsible>
        <ChatComposeMessageSelected />
      </Collapsible>,
    );
    expect(
      screen
        .getByRole("button", { name: "buttonSend" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(
      screen
        .getByRole("button", { name: "buttonStartBatch" })
        .hasAttribute("disabled"),
    ).toBe(false);
  },
);

it.each(["buttonSend", "Enter", "buttonStartBatch"])(
  "submits a file-only message via %s while its file is processing",
  async (submit) => {
    const message = {
      id: "message",
      state: "paused",
      content: { type: "text", text: "", files: [{ path: "nested/file.pdf" }] },
    };
    mocks.context.selectedCurrentMessage = message;
    mocks.context.messageBatch = [message, { ...message, id: "other" }];
    mocks.pendingFilePaths = ["nested/file.pdf"];
    compose();
    expect(screen.queryByRole("status")).toBeNull();
    if (submit === "Enter")
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    else fireEvent.click(screen.getByRole("button", { name: submit }));
    await waitFor(() => expect(client.execute).toHaveBeenCalledOnce());
    expect(mocks.batchState).toHaveBeenCalledTimes(
      submit === "buttonStartBatch" ? 1 : 0,
    );
  },
);

it("does not block on unrelated files or completed and failed uploads", () => {
  mocks.pendingFilePaths = ["/unrelated.pdf"];
  mocks.uploads = [{ state: "success" }, { state: "error" }];
  compose();
  expect(
    screen.getByRole("button", { name: "buttonSend" }).hasAttribute("disabled"),
  ).toBe(false);
});

it("offers upload or existing-file selection and attaches the server-authorized reference", async () => {
  const file = {
    file: true,
    name: "existing.txt",
    path: "existing.txt",
    attachment: {
      storage: {
        type: "documentRepository",
        workspaceId: "workspace",
        documentRepositoryId: "repo",
      },
      agentPath: "docs/existing.txt",
    },
  };
  mocks.selectFile.mockResolvedValue({ data: { file, copied: false } });
  compose();
  act(() => screen.getByRole("button", { name: "labelAttachFiles" }).focus());
  fireEvent.keyDown(screen.getByRole("button", { name: "labelAttachFiles" }), {
    key: "ArrowDown",
  });
  expect(
    await screen.findByRole("menuitem", { name: "labelUploadFiles" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("menuitem", { name: "labelSelectFile" }));
  fireEvent.click(await screen.findByRole("button", { name: "existing.txt" }));
  fireEvent.click(screen.getByRole("button", { name: "labelUseFile" }));
  await waitFor(() => expect(mocks.attach).toHaveBeenCalledWith([file]));
  expect(mocks.selectFile).toHaveBeenCalledWith({
    agentId: "agent",
    activityId: "activity",
    storage: {
      type: "documentRepository",
      workspaceId: "workspace",
      documentRepositoryId: "repo",
    },
    path: "existing.txt",
  });
  expect(mocks.upload).not.toHaveBeenCalled();
});

it.each([
  undefined,
  { serverError: "private detail" },
  { data: { error: "STORAGE_NOT_AUTHORIZED" } },
])(
  "keeps file selection open when the server does not authorize an attachment (%j)",
  async (result) => {
    mocks.selectFile.mockResolvedValue(result);
    compose();
    act(() => screen.getByRole("button", { name: "labelAttachFiles" }).focus());
    fireEvent.keyDown(
      screen.getByRole("button", { name: "labelAttachFiles" }),
      { key: "ArrowDown" },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "labelSelectFile" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "existing.txt" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "labelUseFile" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.queryByText("private detail")).toBeNull();
    expect(mocks.attach).not.toHaveBeenCalled();
  },
);

it("links existing repository attachments to their own storage while local files stay in the chat", () => {
  const repository = {
    type: "documentRepository",
    workspaceId: "workspace",
    documentRepositoryId: "repo",
  };
  mocks.files = [
    { file: true, path: "local.txt", name: "Local" },
    {
      file: true,
      path: "shared.txt",
      name: "Shared",
      attachment: { storage: repository, agentPath: "docs/shared.txt" },
    },
  ];
  mocks.context.selectedCurrentMessage.content.files = mocks.files;
  compose();
  expect(screen.getByRole("link", { name: "Local" }).getAttribute("href")).toBe(
    "/files/local.txt",
  );
  expect(
    screen.getByRole("link", { name: "Shared" }).getAttribute("href"),
  ).toBe("/app/documents/repo/files/shared.txt");
  expect(mocks.tile).toHaveBeenCalledWith(
    expect.objectContaining({
      storage: repository,
      storageObject: mocks.files[1],
    }),
  );
});

it("connects MCP through OAuth bound to the pending approval, not a generic approve", () => {
  render(
    <ChatToolApproval
      request={{
        approvalId: "pending-mcp",
        toolName: "mcp",
        input: { serverId: "trello" },
      }}
    />,
  );
  const form = screen
    .getByRole("button", { name: "labelConnect" })
    .closest("form")!;
  expect(form.getAttribute("action")).toBe("/api/mcp/oauth");
  const fields = new FormData(form);
  expect(fields.get("approvalId")).toBe("pending-mcp");
  expect(fields.get("activityId")).toBe("activity");
  expect(fields.get("agentId")).toBe("agent");
  expect(fields.get("mcpId")).toBe("trello");
  expect(screen.queryByRole("button", { name: "labelApprove" })).toBeNull();
  expect(mocks.approve).not.toHaveBeenCalled();
});

it("replaces the draft and focuses the textbox for tiles and initial or changed hashes", () => {
  mocks.context.interaction = { type: "message-batch" };
  const recommendations = [
    { id: "first", label: "First suggestion", message: "First message" },
    { id: "second", label: "Second suggestion", message: "Second message" },
  ];
  const originalUrl = window.location.href;
  try {
    window.history.replaceState(null, "", "#recommendedMessage=first");
    render(<ChatComposeMessage recommendedMessages={recommendations} />);
    expect(mocks.text).toHaveBeenLastCalledWith("First message");
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
    expect(window.location.hash).toBe("");
    fireEvent.click(screen.getByRole("button", { name: /Second suggestion/ }));
    expect(mocks.text).toHaveBeenLastCalledWith("Second message");
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
    act(() => {
      window.history.replaceState(null, "", "#recommendedMessage=first");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(mocks.text).toHaveBeenLastCalledWith("First message");
    expect(document.activeElement).toBe(screen.getByRole("textbox"));
    expect(client.execute).not.toHaveBeenCalled();
  } finally {
    window.history.replaceState(null, "", originalUrl);
  }
});

describe("agent additional-function availability", () => {
  it("hides disabled attachment and batch controls while preserving existing drafts", () => {
    mocks.context.additionalFunctions = {
      fileUpload: false,
      batch: false,
      disappearingChats: false,
    };
    mocks.context.expiration = { seconds: null, expiresAt: null };
    mocks.context.messageBatch.push({
      id: "second",
      state: "paused",
      content: { type: "text", text: "Second draft" },
    });
    const view = compose();
    expect(
      screen.queryByRole("button", { name: "labelAttachFiles" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "buttonStartBatch" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "labelEnable" })).toBeNull();
    expect(view.container.querySelector('input[type="file"]')).toBeNull();
    expect(view.container.querySelector(".lucide-layers")).toBeNull();
    expect(screen.getByRole("textbox").getAttribute("disabled")).toBeNull();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "Draft",
    );
    expect(mocks.context.messageBatch).toHaveLength(2);
  });
  it.each([true, "default-on"])(
    "allows toggling expiry when the agent mode is %s",
    (mode) => {
      mocks.context.additionalFunctions = { disappearingChats: mode };
      mocks.context.expiration = { seconds: null, expiresAt: null };
      compose();
      fireEvent.click(screen.getByRole("button", { name: "labelEnable" }));
      expect(client.execute).toHaveBeenCalledWith({
        agentId: "agent",
        activityId: "activity",
        seconds: 43200,
      });
    },
  );
  it("lets participants cancel an existing deadline after the agent disables the feature", () => {
    mocks.context.additionalFunctions = { disappearingChats: false };
    mocks.context.expiration = {
      seconds: 43200,
      expiresAt: "2030-01-01T12:00:00Z",
    };
    const view = compose();
    fireEvent.click(screen.getByRole("button", { name: "labelDisable" }));
    expect(client.execute).toHaveBeenCalledWith({
      agentId: "agent",
      activityId: "activity",
      seconds: null,
    });
    mocks.context.expiration = { seconds: null, expiresAt: null };
    view.rerender(
      <Collapsible>
        <ChatComposeMessageSelected />
      </Collapsible>,
    );
    expect(screen.queryByRole("button", { name: "labelEnable" })).toBeNull();
    expect(screen.queryByRole("button", { name: "labelDisable" })).toBeNull();
  });
});

it("closes an open batch drawer when the agent disables batch management", async () => {
  mocks.context.interaction = { type: "message-batch" };
  mocks.context.additionalFunctions = { batch: true };
  const view = render(<ChatComposeMessage />);
  fireEvent.click(
    view.container.querySelector(".lucide-layers")!.closest("button")!,
  );
  expect(
    await screen.findByRole("button", { name: "labelNewMessage" }),
  ).toBeTruthy();
  mocks.context.additionalFunctions = { batch: false };
  view.rerender(<ChatComposeMessage />);
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "labelNewMessage" }),
    ).toBeNull(),
  );
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
    "Draft",
  );
});

it("switches the send slot between recording and sending as text, attachments and uploads change", () => {
  mocks.context.voiceStatus = "ready";
  const draft = mocks.context.messageBatch[0];
  mocks.context.selectedCurrentMessage = draft;
  draft.content.text = "   ";
  const view = compose();
  const refresh = () =>
    view.rerender(
      <Collapsible>
        <ChatComposeMessageSelected />
      </Collapsible>,
    );
  const mic = () => screen.queryByRole("button", { name: "buttonRecord" });
  const send = () => screen.getByRole("button", { name: "buttonSend" });
  expect(mic()).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  expect(mocks.first).not.toHaveBeenCalled();
  draft.content.text = "Hallo";
  refresh();
  expect(mic()).toBeNull();
  expect(send().hasAttribute("disabled")).toBe(false);
  draft.content.text = "";
  draft.content.files = [{ path: "/note.txt" }];
  refresh();
  expect(send().hasAttribute("disabled")).toBe(false);
  draft.content.files = [];
  mocks.uploads = [{ state: "uploading" }];
  refresh();
  expect(send().hasAttribute("disabled")).toBe(true);
  mocks.uploads = [];
  refresh();
  expect(mic()).toBeTruthy();
  mocks.context.voiceStatus = "TRANSCRIBER_REQUIRED";
  refresh();
  expect(mic()).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
  expect(send().hasAttribute("disabled")).toBe(true);
  draft.content.text = "Hallo";
  refresh();
  expect(send().hasAttribute("disabled")).toBe(false);
  expect(screen.queryByRole("status")).toBeNull();
});

it("returns from recording to the draft and sends its processing attachment", async () => {
  mocks.context.voiceStatus = "ready";
  mocks.context.defaultThinking = true;
  mocks.context.selectedCurrentMessage = undefined;
  mocks.context.messageBatch = [];
  const view = compose();
  fireEvent.click(screen.getByRole("button", { name: "buttonRecord" }));
  const recorder = screen.getByRole("button", { name: "Close recorder" });
  expect(recorder.getAttribute("data-start")).toBe("true");
  expect(recorder.getAttribute("data-thinking")).toBe("true");
  fireEvent.click(recorder);
  const draft = {
    id: "first",
    state: "paused",
    content: {
      type: "text",
      text: "",
      thinking: false,
      files: [{ path: "report.pdf" }],
    },
  };
  mocks.context.selectedCurrentMessage = draft;
  mocks.context.messageBatch = [draft];
  mocks.pendingFilePaths = ["report.pdf"];
  view.rerender(
    <Collapsible>
      <ChatComposeMessageSelected />
    </Collapsible>,
  );
  act(() => {
    window.history.replaceState(null, "", "#record");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  const prompt = screen.getByRole("button", { name: "Close recorder" });
  expect(prompt.getAttribute("data-start")).toBe("false");
  expect(prompt.getAttribute("data-thinking")).toBe("false");
  expect(window.location.hash).toBe("");
  fireEvent.click(prompt);
  fireEvent.click(screen.getByRole("button", { name: "buttonSend" }));
  await waitFor(() => expect(client.execute).toHaveBeenCalledOnce());
});
it("allows a document submission when the agent's voice transcriber is unavailable", async () => {
  mocks.context.voiceStatus = "TRANSCRIBER_NOT_FOUND";
  const draft = mocks.context.messageBatch[0];
  draft.content.files = [{ path: "doc.pdf" }];
  mocks.context.selectedCurrentMessage = draft;
  mocks.pendingFilePaths = ["doc.pdf"];
  compose();
  expect(screen.getByRole("status").textContent).toContain(
    "errorTranscriberNotFound",
  );
  fireEvent.click(screen.getByRole("button", { name: "buttonSend" }));
  await waitFor(() => expect(client.execute).toHaveBeenCalledOnce());
});
