import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadMessageFiles } from "../packages/database/src/chat/loadMessageFiles";
const state = vi.hoisted(() => ({ blob: vi.fn(), content: vi.fn() }));
vi.mock("../packages/database/src/storage/getDocumentBlob", () => ({
  getDocumentBlob: state.blob,
}));
vi.mock("../packages/database/src/storage/getDocumentContent", () => ({
  getDocumentContent: state.content,
}));
beforeEach(() => {
  state.blob.mockReset();
  state.content.mockReset();
});
const session = {} as any;
const attachment = (url: string, type: string) => ({
  type: "data-file",
  data: { name: url, url, type },
});
describe("loading message attachments", () => {
  it("deduplicates images across messages and leaves original data unchanged", async () => {
    state.blob.mockResolvedValue(new Blob(["image"], { type: "image/png" }));
    const part = attachment("image.png", "image/png");
    const messages: any = [
      { id: "a", role: "user", parts: [part] },
      { id: "b", role: "user", parts: [part, { type: "text", text: "Hi" }] },
    ];
    const result = await loadMessageFiles(messages, session);
    expect(state.blob).toHaveBeenCalledOnce();
    expect(result[0].parts[0]).toEqual({
      type: "file",
      filename: "image.png",
      mediaType: "image/png",
      url: "data:image/png;base64,aW1hZ2U=",
    });
    expect(result[1].parts[0]).toEqual(result[0].parts[0]);
    expect(messages[0].parts[0]).toBe(part);
    expect(result[1].parts[1]).toEqual({ type: "text", text: "Hi" });
  });
  it("loads markdown and transcripts once per path and provides agent-readable paths", async () => {
    state.content.mockImplementation(async (path) =>
      path === "text.txt"
        ? { type: "mdc", current: "Hello" }
        : {
            type: "transcript",
            segments: [
              { words: [{ word: "Original", wordOverride: "Transcript" }] },
            ],
          },
    );
    const messages: any = [
      {
        id: "a",
        role: "user",
        parts: [
          attachment("text.txt", "text/plain"),
          attachment("text.txt", "text/plain"),
          attachment("voice.wav", "audio/wav"),
        ],
      },
    ];
    const result = await loadMessageFiles(messages, session);
    expect(state.content).toHaveBeenCalledTimes(2);
    expect(result[0].parts[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("path: this_conversation/text.txt"),
    });
    expect((result[0].parts[2] as any).text).toContain("Transcript");
    expect((result[0].parts[2] as any).text).not.toContain("wordOverride");
  });
  it("reports an unavailable transcript instead of pretending to have read the audio", async () => {
    state.content.mockResolvedValue(undefined);
    const result = await loadMessageFiles(
      [
        {
          id: "audio",
          role: "user",
          parts: [attachment("recording.webm", "audio/webm")],
        },
      ] as any,
      session,
    );
    expect(result[0].parts[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("Transcript unavailable"),
    });
  });
  it("preserves unavailable or unsupported attachments and propagates storage errors", async () => {
    state.blob.mockResolvedValue(undefined);
    state.content.mockResolvedValue(undefined);
    const messages: any = [
      {
        id: "a",
        role: "user",
        parts: [
          attachment("missing.png", "image/png"),
          attachment("missing.bin", "application/octet-stream"),
        ],
      },
    ];
    expect(await loadMessageFiles(messages, session)).toEqual(messages);
    state.blob.mockRejectedValue(new Error("download failed"));
    await expect(loadMessageFiles(messages, session)).rejects.toThrow(
      "download failed",
    );
    expect(await loadMessageFiles([], session)).toEqual([]);
  });
});

it("loads repository references from authorized sessions and preserves their real mount path", async () => {
  state.content.mockResolvedValue({ type: "mdc", current: "Mounted content" });
  const mountedSession = {} as any;
  const part = {
    ...attachment("reports/a.txt", "text/plain"),
    data: {
      ...attachment("reports/a.txt", "text/plain").data,
      attachment: {
        storage: {
          type: "documentRepository",
          workspaceId: "w",
          documentRepositoryId: "r",
        },
        agentPath: "forged/path.txt",
      },
    },
  };
  const messages = [{ id: "ref", role: "user", parts: [part] }] as any;
  const result = await loadMessageFiles(messages, session, {
    resolveReference: async () => ({
      storageSession: mountedSession,
      agentPath: "docs/a.txt",
    }),
  });
  expect(state.content).toHaveBeenCalledWith("reports/a.txt", mountedSession);
  expect((result[0]!.parts[0] as any).text).toContain("path: docs/a.txt");
  expect((result[0]!.parts[0] as any).text).not.toContain("forged/path.txt");
  state.content.mockClear();
  const denied = await loadMessageFiles(messages, session);
  expect(state.content).not.toHaveBeenCalled();
  expect((denied[0]!.parts[0] as any).text).toContain("Attachment unavailable");
});
it("does not conflate equal filenames in different repositories", async () => {
  state.content.mockResolvedValue({ type: "mdc", current: "Content" });
  const parts = ["a", "b"].map((id) => ({
    type: "data-file",
    data: {
      id,
      name: "same.txt",
      url: "same.txt",
      type: "text/plain",
      attachment: {
        storage: {
          type: "documentRepository",
          workspaceId: "w",
          documentRepositoryId: id,
        },
        agentPath: id + "/same.txt",
      },
    },
  }));
  await loadMessageFiles(
    [{ id: "refs", role: "user", parts }] as any,
    session,
    {
      resolveReference: async (file) => ({
        storageSession: session,
        agentPath: file.attachment!.agentPath,
      }),
    },
  );
  expect(state.content).toHaveBeenCalledTimes(2);
});

it("names referenced images with the verified mount path", async () => {
  state.blob.mockResolvedValue(new Blob(["image"], { type: "image/png" }));
  const part = attachment("images/photo.png", "image/png");
  const result = await loadMessageFiles(
    [
      {
        id: "image-ref",
        role: "user",
        parts: [
          {
            ...part,
            data: {
              ...part.data,
              attachment: {
                storage: {
                  type: "documentRepository",
                  workspaceId: "w",
                  documentRepositoryId: "r",
                },
                agentPath: "forged.png",
              },
            },
          },
        ],
      },
    ] as any,
    session,
    {
      resolveReference: async () => ({
        storageSession: session,
        agentPath: "knowledge/photo.png",
      }),
    },
  );
  expect(result[0]!.parts[0]).toMatchObject({
    type: "file",
    filename: "knowledge/photo.png",
  });
});
