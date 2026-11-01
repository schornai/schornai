// @vitest-environment jsdom
import "./client-setup";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Doc } from "yjs";
import {
  ChatContext,
  useCanSendMessage,
  useChatStatus,
  useMessages,
} from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatContext";
import {
  ChatComposeMessageContext,
  useChatComposeMessage,
} from "../../apps/web/app/(main)/agent/[agentId]/[activityId]/_components/ChatComposeMessageContext";
import { getChat } from "../../packages/realtime/src/documents/chat/getChat";
import { getChatCurrentMessageBatch } from "../../packages/realtime/src/documents/chatCurrentMessage/getChatCurrentMessageBatch";
const state = vi.hoisted(() => ({
  provider: undefined as any,
  storageProps: undefined as any,
}));
vi.mock("@hocuspocus/provider-react", () => ({
  HocuspocusRoom: ({ children }: any) => children,
  useHocuspocusProvider: () => state.provider,
}));
vi.mock("@/lib/RealtimeRoom", () => ({
  RealtimeRoom: ({ children }: any) => children,
}));
vi.mock("../../apps/web/app/_components/StorageContext", () => ({
  StorageContext: (props: any) => {
    state.storageProps = props;
    return props.children;
  },
}));
vi.mock("../../apps/web/app/_components/FileUploadDropZone", () => ({
  FileUploadDropZone: ({ children }: any) => children,
}));
vi.mock(
  "../../apps/web/app/(main)/_components/ActivityContextProvider",
  () => ({
    useActivites: () => ({ activities: [{ id: "activity", label: "Chat" }] }),
  }),
);
beforeEach(() => {
  state.provider = {
    document: new Doc(),
    isSynced: true,
    hasUnsyncedChanges: false,
    on: vi.fn(),
    off: vi.fn(),
  };
});
afterEach(() => {
  cleanup();
  state.provider.document.destroy();
});
const wrapper = ({ children }: any) => (
  <ChatContext agentId="agent" activityId="activity">
    {children}
  </ChatContext>
);
const mount = (modelThinking?: any) =>
  renderHook(useChatComposeMessage, {
    wrapper: ({ children }) =>
      wrapper({
        children: (
          <ChatComposeMessageContext
            agentId="agent"
            activityId="activity"
            modelThinking={modelThinking}
          >
            {children}
          </ChatComposeMessageContext>
        ),
      }),
  });
describe("chat context", () => {
  it.each([
    [undefined, "idle", true],
    ["idle", "idle", true],
    ["queued", "queued", false],
    ["error", "error", true],
    ["generating", "generating", false],
    ["aborting", "generating", false],
  ])(
    "maps state %s to status %s and sendability %s",
    (stateType, expected, canSend) => {
      const chat = getChat(state.provider.document);
      if (stateType) chat.state.set("type", stateType as any);
      const { result } = renderHook(
        () => ({ status: useChatStatus(), canSend: useCanSendMessage() }),
        { wrapper },
      );
      expect(result.current).toEqual({ status: expected, canSend });
    },
  );
  it("updates subscribed messages and rejects missing provider or unknown state", () => {
    const { result } = renderHook(useMessages, { wrapper });
    const message: any = {
      id: "message",
      role: "user",
      parts: [{ type: "text", text: "Hi" }],
    };
    act(() => getChat(state.provider.document).messages.push([message]));
    expect(result.current).toEqual([message]);
    expect(() => renderHook(useMessages)).toThrow();
    getChat(state.provider.document).state.set("type", "unknown" as any);
    expect(() => renderHook(useChatStatus, { wrapper })).toThrow();
  });
});
describe("composing messages", () => {
  it("creates, edits, selects and deletes a batch using replicated Yjs data", async () => {
    const { result } = mount("optional-on");
    expect(result.current.activity?.label).toBe("Chat");
    expect(result.current.messageBatch).toEqual([]);
    act(() => result.current.setSelectedCurrentMessageText("Hello"));
    expect(result.current.selectedCurrentMessage?.content).toMatchObject({
      type: "text",
      text: "Hello",
      thinking: true,
    });
    const firstId = result.current.selectedCurrentMessage!.id;
    let secondId = "";
    act(() => {
      secondId = result.current.messageBatchAdd().messageId;
    });
    act(() => result.current.setSelectedCurrentMessageId(secondId));
    act(() => result.current.setSelectedCurrentMessageText("Second"));
    act(() => result.current.setSelectedCurrentMessageThinking(false));
    expect(result.current.selectedCurrentMessage?.content).toMatchObject({
      text: "Second",
      thinking: false,
    });
    act(() => result.current.setMessageBatchState("submitted"));
    expect(
      result.current.messageBatch.every((m) => m.state === "submitted"),
    ).toBe(true);
    act(() => result.current.setMessageState(secondId, "preparing"));
    expect(result.current.selectedCurrentMessage?.state).toBe("preparing");
    act(() => result.current.messageBatchDelete(secondId));
    expect(result.current.selectedCurrentMessage?.id).toBe(firstId);
    let submitted = "";
    act(() => {
      submitted = result.current.setFirstCurrentMessageSubmitted();
    });
    expect(submitted).toBe(firstId);
    await expect(
      result.current.waitForSubmittedChanges(),
    ).resolves.toBeUndefined();
  });
  it.each(["mandatory-on", "mandatory-off"])(
    "prevents overriding mandatory thinking mode %s",
    (mode) => {
      const { result } = mount(mode);
      act(() =>
        result.current.setSelectedCurrentMessageThinking(
          mode === "mandatory-off",
        ),
      );
      expect(result.current.messageBatch).toEqual([]);
      act(() => result.current.setFirstCurrentMessageSubmitted());
      expect(result.current.selectedCurrentMessage?.content.thinking).toBe(
        mode === "mandatory-on",
      );
      act(() =>
        result.current.setSelectedCurrentMessageThinking(
          mode === "mandatory-off",
        ),
      );
      expect(result.current.selectedCurrentMessage?.content.thinking).toBe(
        mode === "mandatory-on",
      );
    },
  );
  it("creates a blank draft when changing optional thinking with no selection", () => {
    const { result } = mount("optional-off");
    act(() => result.current.setSelectedCurrentMessageThinking(true));
    expect(result.current.selectedCurrentMessage?.content).toMatchObject({
      text: "",
      thinking: true,
    });
  });
  it("attaches uploaded files to new or existing drafts", () => {
    const { result } = mount();
    const upload: any = {
      id: "file",
      file: new File(["content"], "hello.txt"),
      path: "hello.txt",
      progress: 1,
      sanitizedFileType: "text/plain",
      state: "success",
    };
    act(() => state.storageProps.beforeUpload([upload]));
    expect(result.current.selectedCurrentMessage?.content.files).toHaveLength(
      1,
    );
    act(() =>
      state.storageProps.beforeUpload([
        { ...upload, id: "second", path: "second.txt" },
      ]),
    );
    expect(result.current.selectedCurrentMessage?.content.files).toHaveLength(
      2,
    );
  });
  it("submits exactly one tool approval and rejects duplicate submissions", () => {
    getChat(state.provider.document).messages.push([
      {
        id: "assistant",
        role: "assistant",
        parts: [
          {
            type: "tool-fetch",
            toolCallId: "tool",
            state: "approval-requested",
            input: {},
            approval: { id: "approval" },
          },
        ],
      } as any,
    ]);
    const { result } = mount();
    expect(result.current.interaction.type).toBe("tool-approval");
    act(() =>
      result.current.submitToolApproval({
        approvalId: "approval",
        approved: true,
      }),
    );
    expect(result.current.approvalSubmitted).toBe(true);
    act(() =>
      result.current.submitToolApproval({
        approvalId: "approval",
        approved: false,
      }),
    );
    expect(getChatCurrentMessageBatch(state.provider.document)).toHaveLength(1);
    act(() => state.storageProps.beforeUpload([]));
    expect(result.current.messageBatch).toEqual([]);
  });
  it("ignores unsolicited approvals and requires a provider", () => {
    const { result } = mount();
    act(() =>
      result.current.submitToolApproval({ approvalId: "none", approved: true }),
    );
    expect(result.current.approvalSubmitted).toBe(false);
    expect(() => renderHook(useChatComposeMessage)).toThrow(
      /Must be used inside/,
    );
  });
});

it("keeps submission disabled while cancellation is cleaning up after the worker becomes idle", () => {
  const { result } = renderHook(useCanSendMessage, { wrapper });
  act(() => state.provider.document.getMap("cancellations").set("stop", true));
  act(() => getChat(state.provider.document).state.set("type", "idle"));
  expect(result.current).toBe(false);
  act(() => state.provider.document.getMap("cancellations").delete("stop"));
  expect(result.current).toBe(true);
});
