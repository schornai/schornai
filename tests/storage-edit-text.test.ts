import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  inspect: vi.fn(),
  content: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../packages/database/src/storage/inspect.ts", () => ({
  inspect: state.inspect,
}));
vi.mock("../packages/database/src/storage/getDocumentContent.ts", () => ({
  getDocumentContent: state.content,
}));
vi.mock("../packages/database/src/storage/saveDocumentContent.ts", () => ({
  saveDocumentContent: state.save,
}));
import { updateFileText } from "../packages/database/src/storage/updateFileText";
import { transcriptionToText } from "../packages/database/src/storage/transcriptionToText";
const session = {
  getStoragePath: (path: string) => ({ storagePath: path }),
  supabaseStorage: { update: state.update },
} as any;
beforeEach(() => {
  vi.clearAllMocks();
  state.inspect.mockResolvedValue({
    file: true,
    path: "notes.txt",
    type: "text/plain",
  });
  state.content.mockResolvedValue({
    type: "mdc",
    current: "before",
    versions: [],
  });
  state.save.mockResolvedValue(true);
  state.update.mockResolvedValue({ error: null });
});
it("saves text and updates the original without processing", async () => {
  expect(
    await updateFileText(
      { path: "notes.txt", text: "Grüße 👋", expectedText: "before" },
      { session },
    ),
  ).toMatchObject({ status: "saved" });
  expect(state.save).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ current: "Grüße 👋" }),
    session,
  );
  expect(await state.update.mock.calls[0][1].text()).toBe("Grüße 👋");
});
it("preserves binary originals when editing extracted text", async () => {
  await updateFileText(
    { path: "report.pdf", text: "correction", expectedText: "before" },
    { session },
  );
  expect(state.save).toHaveBeenCalled();
  expect(state.update).not.toHaveBeenCalled();
});
it("rejects stale edits and files without editable content", async () => {
  expect(
    await updateFileText(
      { path: "notes.txt", text: "mine", expectedText: "old" },
      { session },
    ),
  ).toEqual({ status: "conflict" });
  expect(state.save).not.toHaveBeenCalled();
  state.content.mockResolvedValue(undefined);
  await expect(
    updateFileText(
      { path: "weird.bin", text: "mine", expectedText: "" },
      { session },
    ),
  ).rejects.toThrow("FILE_NOT_EDITABLE");
});
it("retains timed transcript segments while overriding the full text, including empty text", async () => {
  const segments = [
    {
      noSpeechProbability: 0,
      timeStart: 1,
      timeEnd: 2,
      words: [{ probability: 1, timeStart: 1, timeEnd: 2, word: "Hello" }],
    },
  ];
  state.content.mockResolvedValue({ type: "transcript", segments });
  await updateFileText(
    { path: "speech.wav", text: "", expectedText: "Hello" },
    { session },
  );
  const saved = state.save.mock.calls[0][1];
  expect(saved.segments).toEqual(segments);
  expect(transcriptionToText(saved)).toBe("");
  expect(state.update).not.toHaveBeenCalled();
});
it("does not update the original if saving processed content fails", async () => {
  state.save.mockResolvedValue(false);
  await expect(
    updateFileText(
      { path: "notes.txt", text: "after", expectedText: "before" },
      { session },
    ),
  ).rejects.toThrow("SAVE_FAILED");
  expect(state.update).not.toHaveBeenCalled();
});
