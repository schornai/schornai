vi.mock("../../apps/web/app/_actions/storageUpdateFileText", () => ({
  storageUpdateFileText: vi.fn(),
}));
// @vitest-environment jsdom
import { formatTime } from "../../apps/web/app/_components/transcription/formatTime";
import "./client-setup";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageFilePreview } from "../../apps/web/app/_components/StorageFilePreview";
import { TranscriptionSegment } from "../../apps/web/app/_components/transcription/TranscriptionSegment";
import { MediaPlayer } from "../../apps/web/app/_components/transcription/MediaPlayer";
import { MediaPlayerDuration } from "../../apps/web/app/_components/transcription/MediaPlayerDuration";
const mocks = vi.hoisted(() => ({
  media: {} as any,
  pending: false,
  save: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  until: vi.fn(),
  time: vi.fn(),
}));
vi.mock(
  "../../apps/web/app/_components/transcription/MediaPlayerContext",
  () => ({
    MediaPlayerContext: ({ children }: any) => children,
    useMediaPlayerContext: () => mocks.media,
  }),
);
vi.mock(
  "../../apps/web/app/_actions/storageUpdateTranscriptionSegment",
  () => ({ storageUpdateTranscriptionSegment: mocks.save }),
);
afterEach(cleanup);
beforeEach(() => {
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:srt"),
      revokeObjectURL: vi.fn(),
    }),
  );
  mocks.pending = false;
  for (const mock of Object.values(mocks))
    if (vi.isMockFunction(mock)) mock.mockClear();
  mocks.media = {
    duration: 125,
    currentTime: 0,
    isPlaying: false,
    hasVideo: true,
    rate: 1,
    volume: 0.5,
    videoRef: { current: null },
    play: mocks.play,
    pause: mocks.pause,
    playUntil: mocks.until,
    setCurrentTime: mocks.time,
    setVolume: vi.fn(),
    setRate: vi.fn(),
  };
  vi.spyOn(console, "log").mockImplementation(() => {});
});
const storage = {
  type: "activity",
  activityId: "activity",
  agentId: "agent",
} as const;
const words = [
  { word: "Hello", probability: 0.8 },
  { word: " world", probability: 0.9 },
  { word: "!", probability: 0.99 },
];
const segment = { timeStart: 10, timeEnd: 20, words } as any;
describe("file previews", () => {
  it.each([
    "code.ts",
    "notes.txt",
    "doc.md",
    "doc.pdf",
    "sheet.xlsx",
    "image.png",
    "slides.pptx",
    "unknown.xyz",
  ])("previews supported content or pending extraction for %s", (path) => {
    const view = render(
      <StorageFilePreview
        fileContent={{ type: "mdc", current: "Content", versions: [] }}
        fileObject={
          { file: true, path, name: path, readableContent: true } as any
        }
        storage={storage}
      />,
    );
    expect(view.container.textContent).toContain(
      path.endsWith("xyz") ? "?" : "Content",
    );
    if (path.endsWith(".png"))
      expect(
        view.container.querySelector("img")!.getAttribute("src"),
      ).toContain("/api/storage/");
  });
  it("shows a pending extraction state and unknown file content fallback", () => {
    const view = render(
      <StorageFilePreview
        fileContent={{ type: "mdc", current: "", versions: [] }}
        fileObject={{ file: true, path: "doc.pdf", name: "doc.pdf" } as any}
        storage={storage}
      />,
    );
    expect(screen.getByText("Noch nicht verarbeitet")).toBeTruthy();
    view.rerender(
      <StorageFilePreview
        fileContent={{ type: "unknown" } as any}
        fileObject={
          { file: true, path: "unknown.xyz", name: "unknown.xyz" } as any
        }
        storage={storage}
      />,
    );
    expect(screen.getByText(/Unbekanntes Dateiformat/)).toBeTruthy();
  });
  it("renders empty and populated transcripts with reviewed percentage", () => {
    const view = render(
      <StorageFilePreview
        fileContent={{ type: "transcript", segments: [] } as any}
        fileObject={{ file: true, path: "audio.mp3", name: "audio" } as any}
        storage={storage}
      />,
    );
    expect(screen.getByText("descriptionEmpty")).toBeTruthy();
    view.rerender(
      <StorageFilePreview
        fileContent={
          {
            type: "transcript",
            segments: [
              { ...segment, reviewed: true },
              { ...segment, reviewed: false },
            ],
          } as any
        }
        fileObject={{ file: true, path: "audio.mp3", name: "audio" } as any}
        storage={storage}
      />,
    );
    expect(screen.getByText("50 %")).toBeTruthy();
    expect(screen.getAllByText("Hello")).toHaveLength(2);
  });
  it("plays the selected segment without offering unsaved edits", () => {
    render(<TranscriptionSegment segment={segment} segmentIndex={0} />);
    fireEvent.click(screen.getByRole("button", { name: "labelPlaySegment" }));
    expect(mocks.time).toHaveBeenCalledWith(10);
    expect(mocks.until).toHaveBeenCalledWith(20);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
  it("keeps failed edits, persists corrections, and regenerates the SRT download", async () => {
    const content = { type: "transcript" as const, segments: [segment] };
    render(
      <StorageFilePreview
        fileContent={content}
        fileObject={{ file: true, path: "audio.mp3", name: "audio.mp3" } as any}
        storage={storage}
      />,
    );
    expect(
      screen
        .getByRole("link", { name: "labelDownloadSrt" })
        .getAttribute("download"),
    ).toBe("audio.srt");
    fireEvent.click(screen.getByRole("button", { name: "labelEditSegment" }));
    expect(screen.queryByRole("link", { name: "labelDownloadSrt" })).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Korrigierter Text" },
    });
    mocks.save.mockResolvedValueOnce({ serverError: "Denied" });
    fireEvent.click(screen.getByRole("button", { name: "labelSave" }));
    expect(await screen.findByText("errorSave")).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "Korrigierter Text",
    );
    mocks.save.mockResolvedValueOnce({
      data: {
        status: "saved",
        transcription: {
          ...content,
          segments: [
            {
              ...segment,
              segmentOverride: "Korrigierter Text",
              reviewed: true,
            },
          ],
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "labelSaveReviewed" }));
    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
    expect(mocks.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: "Korrigierter Text",
        reviewed: true,
        segmentIndex: 0,
        expectedSegment: segment,
      }),
    );
    expect(screen.getByText("Korrigierter Text")).toBeTruthy();
    expect(screen.getByText("100 %")).toBeTruthy();
    expect(screen.getByRole("link", { name: "labelDownloadSrt" })).toBeTruthy();
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "labelEditSegment" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Discard me" },
    });
    fireEvent.click(screen.getByRole("button", { name: "labelCancel" }));
    expect(screen.getByText("Korrigierter Text")).toBeTruthy();
    expect(mocks.save).toHaveBeenCalledTimes(2);
  });
  it("uses segment overrides and pauses the active segment", () => {
    mocks.media.currentTime = 12;
    mocks.media.isPlaying = true;
    mocks.pending = true;
    const view = render(
      <TranscriptionSegment
        segment={{
          ...segment,
          segmentOverride: "Reviewed text",
          reviewed: true,
        }}
        segmentIndex={0}
      />,
    );
    expect(screen.getByText("Reviewed text")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(mocks.pause).toHaveBeenCalledOnce();
    mocks.media.currentTime = 25;
    view.rerender(<TranscriptionSegment segment={segment} segmentIndex={0} />);
    mocks.media.currentTime = 12;
    view.rerender(<TranscriptionSegment segment={segment} segmentIndex={0} />);
  });
  it.each(["loading", "buffering", "seeking"])(
    "announces %s without disabling controls",
    (loading) => {
      mocks.media.loading = loading;
      render(<MediaPlayer filePath="/video.mp4" />);
      expect(screen.getByRole("status").textContent).toBe(
        {
          loading: "labelLoadingMedia",
          buffering: "labelBuffering",
          seeking: "labelSeeking",
        }[loading],
      );
      expect(
        screen
          .getByRole("button", { name: "labelPlay" })
          .hasAttribute("disabled"),
      ).toBe(false);
    },
  );
  it.each([0, 0.2, 0.5, 1])(
    "renders media controls at volume %s and toggles playback and video visibility",
    (volume) => {
      mocks.media.volume = volume;
      const view = render(<MediaPlayer filePath="/audio.mp3" />);
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);
      expect(mocks.play).toHaveBeenCalledOnce();
      mocks.media.isPlaying = true;
      view.rerender(<MediaPlayer filePath="/audio.mp3" />);
      fireEvent.click(screen.getAllByRole("button")[0]);
      expect(mocks.pause).toHaveBeenCalledOnce();
      fireEvent.click(screen.getAllByRole("button").at(-1)!);
      expect(view.container.querySelector("video")!.className).toContain(
        "hidden",
      );
      fireEvent.click(screen.getAllByRole("button").at(-1)!);
      expect(view.container.querySelector("video")!.className).not.toContain(
        "hidden",
      );
    },
  );
  it("supports keyboard seeking, volume control, and mute restore", async () => {
    const view = render(<MediaPlayer filePath="/audio.mp3" />);
    fireEvent.keyDown(
      screen.getByLabelText("labelSeek", { selector: "input" }),
      {
        key: "ArrowRight",
      },
    );
    expect(mocks.time).toHaveBeenCalledWith(0.1);
    fireEvent.keyDown(
      screen.getByLabelText("labelVolume", { selector: "input" }),
      {
        key: "ArrowLeft",
      },
    );
    expect(mocks.media.setVolume).toHaveBeenCalledWith(0.49);
    fireEvent.click(screen.getByRole("button", { name: "labelMute" }));
    expect(mocks.media.setVolume).toHaveBeenCalledWith(0);
    mocks.media.volume = 0;
    view.rerender(<MediaPlayer filePath="/audio.mp3" />);
    fireEvent.click(screen.getByRole("button", { name: "labelUnmute" }));
    expect(mocks.media.setVolume).toHaveBeenLastCalledWith(0.5);
  });
  it("formats playback time using the selected locale without wrapping hours", () => {
    expect(formatTime(3723, "de")).toBe("1:02:03");
    expect(formatTime(3723, "da")).toBe("1.02.03");
    expect(formatTime(90000, "en")).toBe("25:00:00");
  });
  it.each([
    [5, "00:05"],
    [30, "00:30"],
    [125, "02:05"],
    [undefined, "00:00"],
    [NaN, "00:00"],
  ])("formats duration %s", (duration, label) => {
    mocks.media.duration = duration;
    const view = render(
      <>
        <MediaPlayerDuration />
      </>,
    );
    expect(view.container.textContent).toBe(label);
  });
});
