import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStorageProcessingTask } from "../packages/realtime/src/documents/storage/createStorageProcessingTask";
import { getStorageTranscriber } from "../packages/database/src/storage/getStorageTranscriber";
import {
  webFetchFileName,
  webFetchStoragePath,
} from "../apps/realtime/src/chat/tools/web/fileName";
import { fileNeedsProcessing } from "../packages/utils/src/getFileTypeLabel";
const mocks = vi.hoisted(() => ({
  agent: vi.fn(),
  repository: vi.fn(),
  transcribers: vi.fn(),
  transcriber: vi.fn(),
}));
vi.mock("@schornio/aibox-database/agent/getAgentById", () => ({
  getAgentById: mocks.agent,
}));
vi.mock(
  "@schornio/aibox-database/documentRepositories/getDocumentRepositoryById",
  () => ({ getDocumentRepositoryById: mocks.repository }),
);
vi.mock("@schornio/aibox-database/transcriber/getTranscribers", () => ({
  getTranscribers: mocks.transcribers,
}));
vi.mock("@schornio/aibox-database/transcriber/getTranscriberById", () => ({
  getTranscriberById: mocks.transcriber,
}));
const context = { supabase: {} } as any;
const parameters = {
  path: "file.pdf",
  storage: { type: "activity", activityId: "chat", agentId: "agent" },
  userId: "user",
  userClaims: [],
} as const;
beforeEach(() => {
  mocks.agent.mockReset().mockResolvedValue({});
  mocks.repository.mockReset().mockResolvedValue({});
  mocks.transcribers.mockReset().mockResolvedValue([
    {
      identifier: "whisper",
      modelIdentifier: "whisper-model",
      prompt: "Transcribe",
      retryLevel: "balanced",
    },
  ]);
});
describe("shared storage processing", () => {
  it.each([
    "file.pdf",
    "file.HTML",
    "file.docx",
    "file.txt",
    "file.json",
    "file.png",
  ])("uses the upload processing task for %s", async (path) => {
    expect(
      await createStorageProcessingTask(
        { ...parameters, path, userClaims: [] },
        context,
      ),
    ).toMatchObject({
      type: "process-file",
      state: "pending",
      parameters: { ...parameters, path },
    });
  });
  it("extracts HTML through Tika instead of reading markup", () => {
    expect(fileNeedsProcessing("index.html")).toBe("text");
    expect(fileNeedsProcessing("index.XHTML")).toBe("text");
    expect(fileNeedsProcessing("audio.MP3")).toBe("transcript");
  });
  it("routes configured chat and repository media to the existing transcriber", async () => {
    mocks.agent.mockResolvedValue({ transcriberIdentifier: "whisper" });
    mocks.repository.mockResolvedValue({ transcriberIdentifier: "whisper" });
    for (const storage of [
      parameters.storage,
      {
        type: "documentRepository",
        documentRepositoryId: "repo",
        workspaceId: "workspace",
      },
    ] as const) {
      expect(
        await createStorageProcessingTask(
          { ...parameters, storage, path: "recording.mp3", userClaims: [] },
          context,
        ),
      ).toMatchObject({
        type: "transcribe",
        requiredCapabilities: ["transcriber:whisper-model"],
        parameters: {
          modelIdentifier: "whisper-model",
          modelPrompt: "Transcribe",
          retryLevel: "balanced",
          storage,
          userId: "user",
        },
      });
    }
  });
  it("leaves unsupported files and unconfigured media stored without inventing a processor", async () => {
    for (const path of ["archive.zip", "audio.mp3"])
      expect(
        await createStorageProcessingTask(
          { ...parameters, path, userClaims: [] },
          context,
        ),
      ).toBeUndefined();
    mocks.agent.mockResolvedValue({ transcriberIdentifier: "missing" });
    await expect(
      getStorageTranscriber(parameters.storage, context),
    ).rejects.toThrow("TRANSCRIBER_NOT_FOUND");
  });
});
describe("download filenames", () => {
  it.each([
    ["https://example.com/", "text/html", "web/example.com/index.html"],
    [
      "https://example.com/path/to/file",
      "text/html",
      "web/example.com/path/to/file/index.html",
    ],
    [
      "https://example.com/path/to/file/",
      "text/html",
      "web/example.com/path/to/file/index.html",
    ],
    [
      "https://example.com/path/to/file/index.html",
      "text/html",
      "web/example.com/path/to/file/index.html",
    ],
    [
      "https://example.com/reports/annual.pdf",
      "application/pdf",
      "web/example.com/reports/annual.pdf",
    ],
    [
      "https://example.com:8443/guide?q=test#section",
      "text/html",
      "web/example.com_8443/guide/index.html",
    ],
    [
      "https://example.com/%C3%BCber/uns",
      "text/html",
      "web/example.com/uber/uns/index.html",
    ],
    [
      "https://example.com/%2F..%2Fprivate/page",
      "text/html",
      "web/example.com/_.._private/page/index.html",
    ],
  ])("mirrors %s in a stable readable storage path", (url, mime, path) => {
    expect(webFetchStoragePath(new URL(url!), mime!)).toBe(path);
  });
  it.each([
    [
      "https://example.com/download",
      "application/pdf",
      undefined,
      "download.pdf",
    ],
    [
      "https://example.com/REPORT.PDF",
      "application/octet-stream",
      undefined,
      "REPORT.PDF",
    ],
    ["https://example.com/", "text/html", undefined, "download.html"],
    ["https://example.com/page.php", "text/html", undefined, "page.php.html"],
    [
      "https://example.com/",
      "application/pdf",
      'attachment; filename="../../report.pdf"',
      "report.pdf",
    ],
    [
      "https://example.com/",
      "application/pdf",
      "attachment; filename*=UTF-8''Pr%C3%BCfung.pdf",
      "Prüfung.pdf",
    ],
    [
      "https://example.com/",
      "application/pdf",
      "attachment; filename=\"fallback.pdf\"; filename*=UTF-8''%invalid",
      "fallback.pdf",
    ],
  ])("derives safe filenames from %s", (url, mime, disposition, expected) => {
    expect(webFetchFileName(new URL(url), mime!, disposition)).toBe(expected);
  });
});

it("indexes saved transcript text without selecting a transcription model", async () => {
  const task = await createStorageProcessingTask(
    { ...parameters, userClaims: [], path: "audio.wav", useSavedContent: true },
    context,
  );
  expect(task).toMatchObject({
    type: "process-file",
    parameters: { useSavedContent: true },
  });
  expect(mocks.agent).not.toHaveBeenCalled();
});
