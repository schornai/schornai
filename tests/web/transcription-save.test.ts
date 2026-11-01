import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageUpdateTranscriptionSegment } from "../../apps/web/app/_actions/storageUpdateTranscriptionSegment";
import { getDocumentContent } from "@schornio/aibox-package-database/storage/getDocumentContent";
import { transcriptionToSrt } from "../../apps/web/app/_components/transcription/transcriptionText";

vi.mock("@/lib/authorizeStorageMutation", () => ({
  authorizeStorageMutation: vi.fn(async () => ({
    user: { id: "user" },
    userClaims: [],
  })),
}));
const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  dispose: vi.fn(),
  log: vi.fn(),
  json: "",
  session: null as any,
}));
vi.mock("@/lib/serverActionClient", () => ({
  serverActionClient: {
    inputSchema: (schema: any) => ({
      action: (handler: any) => (input: any) =>
        handler({ parsedInput: schema.parse(input) }),
    }),
  },
}));
vi.mock("@/lib/supabase/createSupabaseServerClient", () => ({
  createSupabaseServerClient: async () => ({
    storage: { userScoped: true },
  }),
}));
vi.mock("@schornio/aibox-package-database/storage/inspect", () => ({
  inspect: async (path: string) => ({ file: true, path, name: path }),
}));
vi.mock(
  "@schornio/aibox-realtime/server/ServerRealtimeWebsocketProvider",
  () => ({ ServerRealtimeWebsocketProvider: class {} }),
);
vi.mock(
  "@schornio/aibox-realtime/documents/storage/StorageRealtimeSession",
  () => ({
    StorageRealtimeSession: class {
      abortSignal = new AbortController().signal;
      supabaseStorage = {
        download: async () => ({ data: new Blob([mocks.json]) }),
        upload: mocks.upload,
      };
      logAction = mocks.log;
      getStoragePath(path: string) {
        return { storagePath: path };
      }
      constructor(public options: unknown) {
        mocks.session = this;
      }
      async [Symbol.asyncDispose]() {
        mocks.dispose();
      }
    },
  }),
);
const first = {
  timeStart: 0.125,
  timeEnd: 1.9996,
  noSpeechProbability: 0,
  words: [
    { word: " Original", timeStart: 0.125, timeEnd: 1.9, probability: 0.9 },
  ],
};
const second = {
  ...first,
  timeStart: 3600.001,
  timeEnd: 3602.12,
  segmentOverride: "Andere Korrektur",
};
const input = () => ({
  storage: {
    type: "activity-transcription" as const,
    activityId: "activity",
    transcriberId: "transcriber",
  },
  path: "speech.wav",
  segmentIndex: 0,
  expectedSegment: first,
  text: "Korrigiert\n\nZweite Zeile",
  reviewed: true,
});
beforeEach(() => {
  mocks.json = JSON.stringify({ segments: [first, second] });
  mocks.log.mockReset();
  mocks.dispose.mockReset();
  mocks.upload.mockReset().mockImplementation(async (_path, json) => {
    mocks.json = json;
    return { error: null };
  });
});
describe("transcription persistence and export", () => {
  it("persists corrections, preserves other segments, and exports the reloaded content", async () => {
    const result = await storageUpdateTranscriptionSegment(input());
    expect(result).toMatchObject({ status: "saved" });
    expect(mocks.session.options).toMatchObject({
      supabaseStorage: { userScoped: true },
    });
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringContaining("speech.wav"),
      expect.any(String),
      { upsert: true },
    );
    const reloaded = await getDocumentContent("speech.wav", mocks.session);
    expect(reloaded?.type).toBe("transcript");
    if (reloaded?.type !== "transcript") throw new Error("Wrong content");
    expect(reloaded.segments?.[0]).toEqual({
      ...first,
      segmentOverride: input().text,
      reviewed: true,
    });
    expect(reloaded.segments?.[1]).toEqual(second);
    expect(transcriptionToSrt(reloaded.segments!)).toBe(
      "1\n00:00:00,125 --> 00:00:02,000\nKorrigiert\nZweite Zeile\n\n2\n01:00:00,001 --> 01:00:02,120\nAndere Korrektur\n",
    );
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it("restores the original without discarding word timing", async () => {
    mocks.json = JSON.stringify({
      segments: [{ ...first, segmentOverride: "Edited" }],
    });
    await storageUpdateTranscriptionSegment({
      ...input(),
      expectedSegment: { ...first, segmentOverride: "Edited" },
      text: null,
    });
    expect(JSON.parse(mocks.json).segments[0]).toEqual({
      ...first,
      reviewed: true,
    });
  });
  it("rejects stale edits without uploading", async () => {
    mocks.json = JSON.stringify({
      segments: [{ ...first, segmentOverride: "Changed elsewhere" }],
    });
    expect(await storageUpdateTranscriptionSegment(input())).toEqual({
      status: "conflict",
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("does not report success when storage denies the write", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("Denied") });
    await expect(storageUpdateTranscriptionSegment(input())).rejects.toThrow(
      "Denied",
    );
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });
  it("rejects unavailable segments and invalid input", async () => {
    await expect(
      storageUpdateTranscriptionSegment({ ...input(), segmentIndex: 9 }),
    ).rejects.toThrow("unavailable");
    expect(() =>
      storageUpdateTranscriptionSegment({ ...input(), segmentIndex: -1 }),
    ).toThrow();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("skips empty and invalid cues, honors word overrides, and numbers consecutively", () => {
    expect(
      transcriptionToSrt([
        { ...first, segmentOverride: "" },
        { ...first, timeEnd: -1 },
        { ...first, timeStart: NaN },
        {
          ...first,
          words: [{ ...first.words[0]!, wordOverride: "Wortkorrektur" }],
        },
      ]),
    ).toBe("1\n00:00:00,125 --> 00:00:02,000\nWortkorrektur\n");
  });
});
